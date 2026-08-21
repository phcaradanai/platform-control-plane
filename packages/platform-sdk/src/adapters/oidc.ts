import type { AuthAccessTokenOptions, AuthAdapter } from './types.js';
import type { AuthPhase, AuthSignInOptions, PlatformUser } from '../types.js';
import {
  createLocalJWKSet,
  jwtVerify,
  type JSONWebKeySet,
  type JWTPayload,
} from 'jose';

const CLOCK_SKEW_MS = 30_000;
const TRANSACTION_TTL_MS = 10 * 60 * 1000;
const DEFAULT_SCOPE = 'openid profile email';
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_ID_TOKEN_AGE_SECONDS = TRANSACTION_TTL_MS / 1000;
const ALLOWED_ID_TOKEN_ALGORITHMS = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

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
  /** Maximum duration of each identity-provider operation. */
  timeoutMs?: number;
}

export interface OidcLocation {
  href: string;
  origin: string;
  pathname: string;
  assign(url: string): void;
}

interface OidcMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

interface OidcClaims extends JWTPayload {
  sub?: string;
  nonce?: string;
  auth_time?: number;
  azp?: string;
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
  authorizedParty?: string;
  authTime?: number;
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

interface JsonResponse {
  response: Response;
  body: unknown;
}

class OidcRequestTimeoutError extends Error {
  constructor() {
    super('Identity provider request timed out.');
    this.name = 'OidcRequestTimeoutError';
  }
}

class OidcSessionChangedError extends Error {
  constructor() {
    super('The authentication session changed while refreshing.');
    this.name = 'OidcSessionChangedError';
  }
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
  private readonly timeoutMs: number;
  private readonly transactionStorageKey: string;
  private readonly listeners = new Set<() => void>();
  private snapshot: AuthSnapshot = {
    isAuthenticated: false,
    user: null,
    phase: 'pending',
  };
  private metadataPromise: Promise<OidcMetadata> | undefined;
  private jwksPromise: Promise<ReturnType<typeof createLocalJWKSet>> | undefined;
  private refreshPromise: Promise<string> | undefined;
  private refreshGeneration: number | undefined;
  private refreshController: AbortController | undefined;
  private sessionGeneration = 0;
  private tokens: StoredTokens | undefined;
  private readonly initialization: Promise<void>;

  constructor(config: OidcAuthConfig) {
    this.issuerUrl = normalizeIssuer(config.issuerUrl);
    this.clientId = required(config.clientId, 'clientId');
    this.location = config.location ?? browserLocation();
    this.redirectUri = validateRedirectUri(
      config.redirectUri ?? defaultRedirectUri(this.location),
      'redirectUri',
      this.location.origin,
    );
    this.postLogoutRedirectUri = validateRedirectUri(
      config.postLogoutRedirectUri ?? this.redirectUri,
      'postLogoutRedirectUri',
      this.location.origin,
    );
    this.scope = config.scope?.trim() || DEFAULT_SCOPE;
    this.audience = config.audience?.trim() || undefined;
    this.storage = config.storage ?? browserStorage();
    this.fetchImpl = config.fetch ?? globalFetch();
    this.now = config.now ?? Date.now;
    this.timeoutMs = normalizeTimeout(config.timeoutMs);
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
    } catch {
      // Local sign-out has already completed. If the provider is unavailable,
      // do not keep the user signed in locally or expose provider details.
    }
  };

  getAccessToken = async (
    options: AuthAccessTokenOptions = {},
  ): Promise<string | null> => {
    await raceWithAbort(this.initialization, options.signal);
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
    const generation = this.sessionGeneration;
    try {
      return await this.refresh(tokens, generation, options.signal);
    } catch (error) {
      if (options.signal?.aborted) {
        throw abortError();
      }
      if (
        generation !== this.sessionGeneration ||
        error instanceof OidcSessionChangedError
      ) {
        return null;
      }
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
        await this.startAuthorization(
          'none',
          currentLocationPath(this.location),
          'restore',
        );
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
        await this.refresh(tokens, this.sessionGeneration);
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
    const responseIssuer = url.searchParams.get('iss');
    if (!code && !providerError) {
      return false;
    }

    const transaction = this.readTransaction();
    const callbackState = url.searchParams.get('state');
    this.clearTransaction();
    this.clearCallbackParameters(url);

    if (
      !transaction ||
      this.now() - transaction.createdAt < 0 ||
      this.now() - transaction.createdAt > TRANSACTION_TTL_MS ||
      transaction.state !== callbackState ||
      (responseIssuer !== null && !sameIssuer(responseIssuer, this.issuerUrl))
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
      returnPath: safeReturnPath(
        returnPath ?? currentLocationPath(this.location),
        this.location.origin,
      ),
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
      await withTimeout(() => pkceChallenge(codeVerifier), this.timeoutMs),
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

  private discover(signal?: AbortSignal): Promise<OidcMetadata> {
    if (!this.metadataPromise) {
      this.metadataPromise = this.fetchMetadata(signal).catch(error => {
        this.metadataPromise = undefined;
        throw error;
      });
    }
    return raceWithAbort(this.metadataPromise, signal);
  }

  private async fetchMetadata(signal?: AbortSignal): Promise<OidcMetadata> {
    const result = await this.requestJson(
      `${this.issuerUrl}/.well-known/openid-configuration`,
      { headers: { Accept: 'application/json' } },
      signal,
    );
    const { response, body } = result;
    if (!response.ok) {
      throw new Error(`Identity provider discovery failed (HTTP ${response.status}).`);
    }
    if (!isRecord(body)) {
      throw new Error('Identity provider discovery returned an incomplete configuration.');
    }
    if (
      typeof body.issuer !== 'string' ||
      !sameIssuer(body.issuer, this.issuerUrl)
    ) {
      throw new Error('Identity provider discovery returned an unexpected issuer.');
    }
    const jwksUri = validateMetadataEndpoint(body.jwks_uri, 'jwks_uri');
    const endSessionEndpoint = body.end_session_endpoint;
    if (
      endSessionEndpoint !== undefined &&
      typeof endSessionEndpoint !== 'string'
    ) {
      throw new Error('Identity provider discovery returned an invalid logout endpoint.');
    }
    return {
      issuer: this.issuerUrl,
      authorization_endpoint: validateMetadataEndpoint(
        body.authorization_endpoint,
        'authorization_endpoint',
      ),
      token_endpoint: validateMetadataEndpoint(
        body.token_endpoint,
        'token_endpoint',
      ),
      jwks_uri: jwksUri,
      end_session_endpoint:
        endSessionEndpoint === undefined
          ? undefined
          : validateMetadataEndpoint(
              endSessionEndpoint,
              'end_session_endpoint',
            ),
    };
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
    const result = await this.requestJson(metadata.token_endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    return this.parseTokenResponse(result, undefined, nonce);
  }

  private refresh(
    tokens: StoredTokens,
    generation: number,
    signal?: AbortSignal,
  ): Promise<string> {
    if (
      this.refreshPromise &&
      this.refreshGeneration === generation
    ) {
      return raceWithAbort(this.refreshPromise, signal);
    }
    const controller = new AbortController();
    const promise = (async () => {
      const metadata = await this.discover(controller.signal);
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken!,
        client_id: this.clientId,
      });
      const result = await this.requestJson(metadata.token_endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      }, controller.signal);
      const next = await this.parseTokenResponse(result, tokens);
      if (
        generation !== this.sessionGeneration ||
        controller.signal.aborted ||
        this.tokens !== tokens
      ) {
        throw new OidcSessionChangedError();
      }
      this.storeTokens(next);
      this.setAuthenticated(next);
      return next.accessToken;
    })().finally(() => {
      if (this.refreshController === controller) {
        this.refreshPromise = undefined;
        this.refreshGeneration = undefined;
        this.refreshController = undefined;
      }
    });
    this.refreshPromise = promise;
    this.refreshGeneration = generation;
    this.refreshController = controller;
    return raceWithAbort(promise, signal);
  }

  private requestJson(
    url: string,
    init: RequestInit,
    externalSignal?: AbortSignal,
  ): Promise<JsonResponse> {
    return withTimeout(async signal => {
      const response = await this.fetchImpl(url, {
        ...init,
        signal,
      });
      const body = await response.json().catch(() => null);
      return { response, body };
    }, this.timeoutMs, externalSignal);
  }

  private async parseTokenResponse(
    result: JsonResponse,
    previous: StoredTokens | undefined,
    expectedNonce?: string,
  ): Promise<StoredTokens> {
    const { response, body } = result;
    if (!response.ok) {
      throw new Error('The identity provider rejected the token request.');
    }
    if (!isRecord(body)) {
      throw new Error('The identity provider returned an invalid token response.');
    }
    if (
      typeof body.token_type !== 'string' ||
      body.token_type.toLowerCase() !== 'bearer'
    ) {
      throw new Error('The identity provider returned an unsupported token type.');
    }
    const accessToken = body.access_token;
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('The identity provider returned no access token.');
    }
    const rawIdToken = body.id_token;
    if (
      rawIdToken !== undefined &&
      (typeof rawIdToken !== 'string' || rawIdToken.trim().length === 0)
    ) {
      throw new Error('The identity provider returned an invalid identity token.');
    }
    const idToken = rawIdToken ?? previous?.idToken;
    if (!idToken) {
      throw new Error('The identity provider returned no identity token.');
    }
    const claims = rawIdToken
      ? await this.verifyIdToken(
          rawIdToken,
          expectedNonce,
          previous?.user.id,
          previous?.authorizedParty,
          previous?.authTime,
        )
      : undefined;
    if (expectedNonce && !claims) {
      throw new Error('The identity provider returned an invalid sign-in response.');
    }
    const user = claims ? claimsToUser(claims) : previous?.user;
    if (!user) {
      throw new Error('The identity provider returned no authenticated identity.');
    }
    const rawExpiresIn = body.expires_in;
    if (
      rawExpiresIn !== undefined &&
      (typeof rawExpiresIn !== 'number' ||
        !Number.isFinite(rawExpiresIn) ||
        rawExpiresIn <= 0)
    ) {
      throw new Error('The identity provider returned an invalid token lifetime.');
    }
    const expiresIn = rawExpiresIn === undefined ? 300 : rawExpiresIn;
    const rawRefreshToken = body.refresh_token;
    if (
      rawRefreshToken !== undefined &&
      (typeof rawRefreshToken !== 'string' ||
        rawRefreshToken.trim().length === 0)
    ) {
      throw new Error('The identity provider returned an invalid refresh token.');
    }
    const refreshToken = rawRefreshToken ?? previous?.refreshToken;
    return {
      accessToken,
      expiresAt: this.now() + expiresIn * 1000,
      refreshToken,
      idToken,
      user,
      authorizedParty: claims?.azp ?? previous?.authorizedParty,
      authTime: claims?.auth_time ?? previous?.authTime,
    };
  }

  private getJwks(): Promise<ReturnType<typeof createLocalJWKSet>> {
    if (!this.jwksPromise) {
      this.jwksPromise = this.fetchJwks().catch(error => {
        this.jwksPromise = undefined;
        throw error;
      });
    }
    return this.jwksPromise;
  }

  private async fetchJwks(): Promise<ReturnType<typeof createLocalJWKSet>> {
    const metadata = await this.discover();
    const result = await this.requestJson(
      metadata.jwks_uri,
      { headers: { Accept: 'application/json' } },
    );
    if (!result.response.ok || !isRecord(result.body)) {
      throw new Error('Identity provider JWKS retrieval failed.');
    }
    if (!Array.isArray(result.body.keys)) {
      throw new Error('Identity provider JWKS is invalid.');
    }
    return createLocalJWKSet(result.body as unknown as JSONWebKeySet);
  }

  private async verifyIdToken(
    idToken: string,
    expectedNonce?: string,
    expectedSubject?: string,
    expectedAuthorizedParty?: string,
    expectedAuthTime?: number,
  ): Promise<OidcClaims> {
    const keySet = await this.getJwks();
    const { payload } = await jwtVerify<OidcClaims>(idToken, keySet, {
      algorithms: ALLOWED_ID_TOKEN_ALGORITHMS,
      audience: this.clientId,
      clockTolerance: CLOCK_SKEW_MS / 1000,
      issuer: this.issuerUrl,
      maxTokenAge: MAX_ID_TOKEN_AGE_SECONDS,
      requiredClaims: ['iss', 'sub', 'aud', 'exp', 'iat'],
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('The identity provider returned no user subject.');
    }
    if (expectedNonce !== undefined && payload.nonce !== expectedNonce) {
      throw new Error('The identity provider returned an invalid sign-in response.');
    }
    const audience = payload.aud;
    if (
      Array.isArray(audience) &&
      audience.some(value => value !== this.clientId)
    ) {
      throw new Error('The identity provider returned an invalid audience.');
    }
    if (
      Array.isArray(audience) &&
      audience.length > 1 &&
      payload.azp !== this.clientId
    ) {
      throw new Error('The identity provider returned an invalid authorized party.');
    }
    if (
      payload.azp !== undefined &&
      (typeof payload.azp !== 'string' || payload.azp !== this.clientId)
    ) {
      throw new Error('The identity provider returned an invalid authorized party.');
    }
    if (
      payload.auth_time !== undefined &&
      (!Number.isInteger(payload.auth_time) || payload.auth_time < 0)
    ) {
      throw new Error('The identity provider returned an invalid auth time.');
    }
    if (expectedSubject !== undefined) {
      if (payload.sub !== expectedSubject) {
        throw new Error('The identity provider returned a different subject.');
      }
      if (payload.azp !== expectedAuthorizedParty) {
        throw new Error('The identity provider returned a different authorized party.');
      }
      if (payload.auth_time !== expectedAuthTime) {
        throw new Error('The identity provider returned a different auth time.');
      }
    }
    return payload;
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
    this.sessionGeneration += 1;
    this.refreshController?.abort();
    this.tokens = undefined;
    this.clearTransaction();
  }

  private readTransaction(): AuthTransaction | null {
    if (!this.storage) {
      return null;
    }
    try {
      const value = this.storage.getItem(this.transactionStorageKey);
      const transaction = value ? JSON.parse(value) : null;
      return isAuthTransaction(transaction) ? transaction : null;
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

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('OIDC timeoutMs must be a positive finite number.');
  }
  return value;
}

function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  if (externalSignal?.aborted) {
    return Promise.reject(abortError());
  }
  const controller = new AbortController();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timerRef: { id?: ReturnType<typeof setTimeout> } = {};
    let cleanup = () => {};
    const resolveOnce = (value: T) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      controller.abort();
      rejectOnce(abortError());
    };
    cleanup = () => {
      if (timerRef.id !== undefined) {
        clearTimeout(timerRef.id);
      }
      externalSignal?.removeEventListener('abort', onAbort);
    };

    timerRef.id = setTimeout(() => {
      controller.abort();
      rejectOnce(new OidcRequestTimeoutError());
    }, timeoutMs);
    externalSignal?.addEventListener('abort', onAbort, { once: true });

    let operationPromise: Promise<T>;
    try {
      operationPromise = operation(controller.signal);
    } catch (error) {
      rejectOnce(error);
      return;
    }
    void operationPromise.then(resolveOnce, rejectOnce);
  });
}

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function raceWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(abortError());
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      resolve(value);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      reject(error);
    };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    void promise.then(resolveOnce, rejectOnce);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateMetadataEndpoint(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Identity provider discovery returned an invalid ${name}.`,
    );
  }
  return validateUrl(value, `discovery ${name}`);
}

function isAuthTransaction(value: unknown): value is AuthTransaction {
  return (
    isRecord(value) &&
    typeof value.state === 'string' &&
    value.state.length > 0 &&
    typeof value.nonce === 'string' &&
    value.nonce.length > 0 &&
    typeof value.codeVerifier === 'string' &&
    value.codeVerifier.length > 0 &&
    typeof value.returnPath === 'string' &&
    typeof value.createdAt === 'number' &&
    Number.isFinite(value.createdAt) &&
    (value.mode === 'interactive' || value.mode === 'restore')
  );
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

function validateRedirectUri(value: string, name: string, origin: string): string {
  const redirectUri = validateUrl(value, name);
  if (new URL(redirectUri).origin !== origin) {
    throw new Error(`OIDC ${name} must use the application origin.`);
  }
  return redirectUri;
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
  // Preserve registered redirect and endpoint URI spelling. Issuer
  // comparison removes a trailing slash separately, while redirect URI
  // matching must remain exact at the provider.
  return url.toString();
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

function currentLocationPath(location: OidcLocation): string {
  try {
    const url = new URL(location.href, location.origin);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

function sameIssuer(value: string, expected: string): boolean {
  try {
    return normalizeIssuer(value) === expected;
  } catch {
    return false;
  }
}

function safeReturnPath(value: string | undefined, origin: string): string {
  if (!value) {
    return '/';
  }
  try {
    const url = new URL(value, origin);
    if (
      url.origin !== origin ||
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\')
    ) {
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

function claimsToUser(claims: OidcClaims): PlatformUser {
  const stringClaim = (value: unknown): string | undefined =>
    typeof value === 'string' && value.length > 0 ? value : undefined;
  return {
    id: claims.sub!,
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
