import type {
  AuthAdapter,
} from './types.js';
import type { AuthPhase, AuthSignInOptions, PlatformUser } from '../types.js';

const CLOCK_SKEW_MS = 30_000;
const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SCOPE = 'openid profile email';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface OidcAuthConfig {
  /** Issuer URL, for example https://keycloak.example.com/realms/platform. */
  issuerUrl: string;
  /** Public browser client ID. A client secret must never be supplied here. */
  clientId: string;
  /** Registered callback URL. Defaults to the current browser path. */
  redirectUri?: string;
  /** Registered post-logout callback URL. Defaults to redirectUri. */
  postLogoutRedirectUri?: string;
  /** OIDC scopes. Defaults to `openid profile email`. */
  scope?: string;
  /** Optional provider-specific audience, such as a Keycloak API audience. */
  audience?: string;
  /** Injectable for tests; production uses sessionStorage. */
  storage?: StorageLike;
  /** Injectable for tests; production uses window.fetch. */
  fetch?: typeof fetch;
  /** Injectable for tests; production uses window.location. */
  location?: OidcLocation;
  /** Injectable for tests; production uses Date.now. */
  now?: () => number;
}

export interface OidcLocation {
  href: string;
  origin: string;
  pathname: string;
  assign(url: string): void;
}

interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

interface OidcClaims {
  sub?: unknown;
  nonce?: unknown;
  name?: unknown;
  preferred_username?: unknown;
  email?: unknown;
  picture?: unknown;
}

interface StoredTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
  idToken: string;
  user: PlatformUser;
}

interface AuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnPath: string;
  createdAt: number;
  mode: 'interactive' | 'restore';
}

interface AuthSnapshot {
  isAuthenticated: boolean;
  user: PlatformUser | null;
  phase: AuthPhase;
  error?: string;
}

/**
 * Browser OIDC adapter for public clients. It uses Authorization Code + PKCE,
 * never accepts a client secret, keeps tokens in memory, and leaves
 * authorization decisions to the API/backend that validates the bearer token.
 */
class OidcAuthController implements AuthAdapter {
  private readonly issuerUrl: string;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly postLogoutRedirectUri: string;
  private readonly scope: string;
  private readonly audience: string | undefined;
  private readonly storage: StorageLike | null;
  private readonly fetchImpl: typeof fetch;
  private readonly location: OidcLocation;
  private readonly now: () => number;
  private readonly transactionStorageKey: string;
  private readonly listeners = new Set<() => void>();
  private snapshot: AuthSnapshot = {
    isAuthenticated: false,
    user: null,
    phase: 'pending',
  };
  private metadataPromise: Promise<OidcMetadata> | undefined;
  private refreshPromise: Promise<string | null> | undefined;
  private tokens: StoredTokens | undefined;
  private readonly initialization: Promise<void>;

  constructor(config: OidcAuthConfig) {
    this.issuerUrl = normalizeIssuer(config.issuerUrl);
    this.clientId = required(config.clientId, 'clientId');
    this.location = config.location ?? browserLocation();
    this.redirectUri = validateRedirectUri(
      config.redirectUri ?? defaultRedirectUri(this.location),
      'redirectUri',
    );
    this.postLogoutRedirectUri = validateRedirectUri(
      config.postLogoutRedirectUri ?? this.redirectUri,
      'postLogoutRedirectUri',
    );
    this.scope = config.scope?.trim() || DEFAULT_SCOPE;
    this.audience = config.audience?.trim() || undefined;
    this.storage = config.storage ?? browserStorage();
    this.fetchImpl = config.fetch ?? globalFetch();
    this.now = config.now ?? Date.now;
    this.transactionStorageKey = `platform-sdk:oidc:${this.clientId}:transaction`;
    this.initialization = this.restoreSession();
  }

  getSnapshot = (): AuthSnapshot => this.snapshot;

  subscribe = (onChange: () => void): (() => void) => {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  };

  signIn = async (options: AuthSignInOptions = {}): Promise<void> => {
    await this.initialization;
    if (this.snapshot.isAuthenticated) {
      return;
    }
    if (!this.storage) {
      throw this.setActionError('Session storage is unavailable in this browser.');
    }
    try {
      await this.startAuthorization(
        undefined,
        options.returnPath,
        'interactive',
      );
    } catch (error) {
      this.clearTransaction();
      this.setActionError(safeErrorMessage(error));
      throw error;
    }
  };

  signOut = async (): Promise<void> => {
    await this.initialization;
    const idToken = this.readTokens()?.idToken;
    this.clearTokens();
    this.setSnapshot({
      isAuthenticated: false,
      user: null,
      phase: 'idle',
    });

    try {
      const metadata = await this.discover();
      if (!metadata.end_session_endpoint) {
        return;
      }
      const logoutUrl = new URL(metadata.end_session_endpoint);
      logoutUrl.searchParams.set(
        'post_logout_redirect_uri',
        this.postLogoutRedirectUri,
      );
      if (idToken) {
        logoutUrl.searchParams.set('id_token_hint', idToken);
      }
      this.location.assign(logoutUrl.toString());
      await new Promise<void>(() => {});
    } catch {
      // Local sign-out has already completed. If the provider is unavailable,
      // do not keep the user signed in locally or expose provider details.
    }
  };

  getAccessToken = async (): Promise<string | null> => {
    await this.initialization;
    const tokens = this.readTokens();
    if (!tokens) {
      return null;
    }
    if (tokens.expiresAt > this.now() + CLOCK_SKEW_MS) {
      return tokens.accessToken;
    }
    if (!tokens.refreshToken) {
      this.expireSession();
      return null;
    }
    try {
      return await this.refresh(tokens);
    } catch {
      this.expireSession();
      return null;
    }
  };

  handleUnauthorized = (): void => {
    if (this.tokens || this.snapshot.isAuthenticated) {
      this.expireSession();
    }
  };

  private async restoreSession(): Promise<void> {
    try {
      const callbackHandled = await this.handleCallback();
      if (callbackHandled) {
        return;
      }
      const tokens = this.readTokens();
      if (!tokens) {
        if (!this.storage) {
          this.setActionError('Session storage is unavailable in this browser.');
          return;
        }
        // Tokens remain memory-only. A refresh asks the IdP's existing browser
        // session for a new code without showing a login screen.
        await this.startAuthorization('none', '/', 'restore');
        return;
      }
      if (tokens.expiresAt > this.now() + CLOCK_SKEW_MS) {
        this.setAuthenticated(tokens);
        return;
      }
      if (!tokens.refreshToken) {
        this.expireSession();
        return;
      }
      try {
        await this.refresh(tokens);
      } catch {
        this.expireSession();
      }
    } catch (error) {
      this.setActionError(safeErrorMessage(error));
    }
  }

  private async handleCallback(): Promise<boolean> {
    const url = new URL(this.location.href);
    const code = url.searchParams.get('code');
    const providerError = url.searchParams.get('error');
    if (!code && !providerError) {
      return false;
    }

    const transaction = this.readTransaction();
    const callbackState = url.searchParams.get('state');
    this.clearTransaction();
    this.clearCallbackParameters(url);

    if (
      !transaction ||
      this.now() - transaction.createdAt > TRANSACTION_TTL_MS ||
      transaction.state !== callbackState
    ) {
      this.setActionError('The sign-in response could not be verified. Try again.');
      return true;
    }
    if (providerError) {
      if (transaction.mode === 'restore') {
        this.setSnapshot({
          isAuthenticated: false,
          user: null,
          phase: 'idle',
        });
        return true;
      }
      this.setActionError('Sign-in was cancelled or rejected by the identity provider.');
      return true;
    }
    if (!code) {
      this.setActionError('The identity provider returned no authorization code.');
      return true;
    }

    this.setSnapshot({
      isAuthenticated: false,
      user: null,
      phase: 'pending',
    });
    const metadata = await this.discover();
    const tokens = await this.exchangeCode(
      metadata,
      code,
      transaction.codeVerifier,
      transaction.nonce,
    );
    this.storeTokens(tokens);
    this.setAuthenticated(tokens);
    this.navigateTo(transaction.returnPath);
    return true;
  }

  private async startAuthorization(
    prompt: 'none' | undefined,
    returnPath: string | undefined,
    mode: AuthTransaction['mode'],
  ): Promise<void> {
    if (!this.storage) {
      throw new Error('Session storage is unavailable in this browser.');
    }
    this.setSnapshot({
      isAuthenticated: false,
      user: null,
      phase: 'pending',
    });
    const metadata = await this.discover();
    const state = randomString();
    const nonce = randomString();
    const codeVerifier = randomString();
    const transaction: AuthTransaction = {
      state,
      nonce,
      codeVerifier,
      returnPath: safeReturnPath(returnPath, this.location.origin),
      createdAt: this.now(),
      mode,
    };
    this.storage.setItem(
      this.transactionStorageKey,
      JSON.stringify(transaction),
    );

    const authorizationUrl = new URL(metadata.authorization_endpoint);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', this.clientId);
    authorizationUrl.searchParams.set('redirect_uri', this.redirectUri);
    authorizationUrl.searchParams.set('scope', this.scope);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    authorizationUrl.searchParams.set(
      'code_challenge',
      await pkceChallenge(codeVerifier),
    );
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    if (prompt) {
      authorizationUrl.searchParams.set('prompt', prompt);
    }
    if (this.audience) {
      authorizationUrl.searchParams.set('audience', this.audience);
    }

    this.location.assign(authorizationUrl.toString());
    if (mode === 'restore') {
      return;
    }
    // A successful interactive sign-in navigates away. The unresolved promise
    // prevents the Feature Pack from navigating over the provider redirect.
    await new Promise<void>(() => {});
  }

  private clearCallbackParameters(url: URL): void {
    for (const key of [
      'code',
      'state',
      'error',
      'error_description',
      'error_uri',
      'session_state',
      'scope',
    ]) {
      url.searchParams.delete(key);
    }
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState(
        null,
        document.title,
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }

  private navigateTo(returnPath: string): void {
    const safePath = safeReturnPath(returnPath, this.location.origin);
    const currentPath = `${this.location.pathname}${new URL(this.location.href).search}`;
    if (safePath === currentPath || typeof window === 'undefined') {
      return;
    }
    window.history.replaceState(null, document.title, safePath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  private discover(): Promise<OidcMetadata> {
    if (!this.metadataPromise) {
      this.metadataPromise = this.fetchMetadata().catch(error => {
        this.metadataPromise = undefined;
        throw error;
      });
    }
    return this.metadataPromise;
  }

  private async fetchMetadata(): Promise<OidcMetadata> {
    const response = await this.fetchImpl(
      `${this.issuerUrl}/.well-known/openid-configuration`,
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) {
      throw new Error(`Identity provider discovery failed (HTTP ${response.status}).`);
    }
    const metadata = (await response.json()) as Partial<OidcMetadata>;
    if (
      typeof metadata.authorization_endpoint !== 'string' ||
      typeof metadata.token_endpoint !== 'string'
    ) {
      throw new Error('Identity provider discovery returned an incomplete configuration.');
    }
    return metadata as OidcMetadata;
  }

  private async exchangeCode(
    metadata: OidcMetadata,
    code: string,
    codeVerifier: string,
    nonce: string,
  ): Promise<StoredTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });
    const response = await this.fetchImpl(metadata.token_endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    return this.parseTokenResponse(response, undefined, nonce);
  }

  private async refresh(tokens: StoredTokens): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    this.refreshPromise = (async () => {
      const metadata = await this.discover();
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken!,
        client_id: this.clientId,
      });
      const response = await this.fetchImpl(metadata.token_endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const next = await this.parseTokenResponse(response, tokens);
      this.storeTokens(next);
      this.setAuthenticated(next);
      return next.accessToken;
    })().finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private async parseTokenResponse(
    response: Response,
    previous: StoredTokens | undefined,
    expectedNonce?: string,
  ): Promise<StoredTokens> {
    const body = (await response.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!response.ok) {
      throw new Error('The identity provider rejected the token request.');
    }
    if (!body) {
      throw new Error('The identity provider returned an invalid token response.');
    }
    const accessToken = body?.access_token;
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new Error('The identity provider returned no access token.');
    }
    const idToken =
      typeof body.id_token === 'string' ? body.id_token : previous?.idToken;
    if (!idToken) {
      throw new Error('The identity provider returned no identity token.');
    }
    const claims = decodeClaims(idToken);
    if (expectedNonce && claims.nonce !== expectedNonce) {
      throw new Error('The identity provider returned an invalid sign-in response.');
    }
    const user = previous?.user ?? claimsToUser(claims);
    const expiresIn =
      typeof body.expires_in === 'number' && body.expires_in > 0
        ? body.expires_in
        : 300;
    const refreshToken =
      typeof body.refresh_token === 'string'
        ? body.refresh_token
        : previous?.refreshToken;
    return {
      accessToken,
      expiresAt: this.now() + expiresIn * 1000,
      refreshToken,
      idToken,
      user,
    };
  }

  private setAuthenticated(tokens: StoredTokens): void {
    this.setSnapshot({
      isAuthenticated: true,
      user: tokens.user,
      phase: 'idle',
    });
  }

  private expireSession(): void {
    this.clearTokens();
    this.setSnapshot({
      isAuthenticated: false,
      user: null,
      phase: 'error',
      error: 'Your session expired. Sign in again.',
    });
  }

  private setActionError(message: string): Error {
    const error = new Error(message);
    this.setSnapshot({
      isAuthenticated: false,
      user: null,
      phase: 'error',
      error: message,
    });
    return error;
  }

  private setSnapshot(snapshot: AuthSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private readTokens(): StoredTokens | null {
    return this.tokens ?? null;
  }

  private storeTokens(tokens: StoredTokens): void {
    this.tokens = tokens;
  }

  private clearTokens(): void {
    this.tokens = undefined;
    this.clearTransaction();
  }

  private readTransaction(): AuthTransaction | null {
    if (!this.storage) {
      return null;
    }
    try {
      const value = this.storage.getItem(this.transactionStorageKey);
      return value ? (JSON.parse(value) as AuthTransaction) : null;
    } catch {
      return null;
    }
  }

  private clearTransaction(): void {
    this.storage?.removeItem(this.transactionStorageKey);
  }
}

export function createOidcAuthAdapter(config: OidcAuthConfig): AuthAdapter {
  return new OidcAuthController(config);
}

function normalizeIssuer(value: string): string {
  const issuer = validateUrl(value, 'issuerUrl');
  return issuer.replace(/\/+$/, '');
}

function required(value: string, name: string): string {
  if (!value?.trim()) {
    throw new Error(`OIDC ${name} is required.`);
  }
  return value.trim();
}

function validateRedirectUri(value: string, name: string): string {
  return validateUrl(value, name);
}

function validateUrl(value: string, name: string): string {
  let url: URL;
  try {
    url = new URL(required(value, name));
  } catch {
    throw new Error(`OIDC ${name} must be an absolute URL.`);
  }
  const localHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error(`OIDC ${name} must use HTTPS outside local development.`);
  }
  return url.toString().replace(/\/$/, '');
}

function browserLocation(): OidcLocation {
  if (typeof window === 'undefined') {
    throw new Error('OIDC authentication requires a browser runtime.');
  }
  return window.location;
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function globalFetch(): typeof fetch {
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('OIDC authentication requires browser fetch support.');
  }
  return globalThis.fetch.bind(globalThis);
}

function defaultRedirectUri(location: OidcLocation): string {
  return new URL('/authentication', location.origin).toString();
}

function safeReturnPath(value: string | undefined, origin: string): string {
  if (!value) {
    return '/';
  }
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin || !value.startsWith('/') || value.startsWith('//')) {
      return '/';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function randomString(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeClaims(idToken: string): OidcClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('The identity provider returned an invalid identity token.');
  }
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as OidcClaims;
    if (typeof claims.sub !== 'string' || claims.sub.length === 0) {
      throw new Error('The identity provider returned no user subject.');
    }
    return claims;
  } catch (error) {
    if (error instanceof Error && error.message.includes('no user subject')) {
      throw error;
    }
    throw new Error('The identity provider returned an invalid identity token.');
  }
}

function claimsToUser(claims: OidcClaims): PlatformUser {
  const stringClaim = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;
  return {
    id: claims.sub as string,
    displayName:
      stringClaim(claims.name) ?? stringClaim(claims.preferred_username),
    email: stringClaim(claims.email),
    avatarUrl: stringClaim(claims.picture),
  };
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The identity provider could not complete this action.';
}
