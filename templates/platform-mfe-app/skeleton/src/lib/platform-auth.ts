import {
  createOidcAuthAdapter,
  createStandaloneAuthAdapter,
  type AuthAdapter,
  type AuthSignInOptions,
  type OidcAuthConfig,
  type OidcLocation,
  type StorageLike,
} from '@platform/sdk';

import { env, type AuthEnvironment } from './env';

const AUTHENTICATION_PATH = '/authentication';
const RESTORE_ATTEMPT_SUFFIX = ':restore-attempt';
const SILENT_RESTORE_SUPPRESSED =
  'Silent session restoration was suppressed after a previous failed attempt.';

type AuthSnapshot = Exclude<ReturnType<AuthAdapter['getSnapshot']>, null>;

/** Compatible with both the current host contract and older vendored SDKs. */
interface AuthAccessTokenOptions {
  signal?: AbortSignal;
}

type AccessTokenReader = (
  options?: AuthAccessTokenOptions,
) => Promise<string | null>;

function readAccessToken(
  adapter: AuthAdapter | undefined,
  options?: AuthAccessTokenOptions,
): Promise<string | null> {
  const reader = adapter?.getAccessToken as AccessTokenReader | undefined;
  return reader?.(options) ?? Promise.resolve(null);
}

/**
 * Keep browser return state path-only and same-origin. This is intentionally
 * also applied at the generated adapter boundary because host adapters are
 * supplied by external runtimes and should receive the same safe contract as
 * the generated OIDC adapter.
 */
export function safeReturnPath(
  value: string | null | undefined,
  origin = browserOrigin(),
): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    !origin
  ) {
    return '/';
  }

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) {
      return '/';
    }
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith('/') && !path.startsWith('//') ? path : '/';
  } catch {
    return '/';
  }
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin;
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

function locationFor(config: OidcAuthConfig): OidcLocation | undefined {
  if (config.location) {
    return config.location;
  }
  return typeof window === 'undefined' ? undefined : window.location;
}

function callbackPathFor(
  config: OidcAuthConfig,
  location: OidcLocation | undefined,
): string {
  const origin = location?.origin ?? browserOrigin();
  if (!origin) {
    return AUTHENTICATION_PATH;
  }
  try {
    return new URL(
      config.redirectUri ?? new URL(AUTHENTICATION_PATH, origin).toString(),
      origin,
    ).pathname;
  } catch {
    return AUTHENTICATION_PATH;
  }
}

function hasAuthorizationCallback(location: OidcLocation | undefined): boolean {
  if (!location) {
    return false;
  }
  try {
    const url = new URL(location.href, location.origin);
    return Boolean(
      url.searchParams.get('code') || url.searchParams.get('error'),
    );
  } catch {
    return false;
  }
}

function currentReturnPath(
  config: OidcAuthConfig,
  location: OidcLocation | undefined,
): string {
  if (!location) {
    return '/';
  }
  try {
    const url = new URL(location.href, location.origin);
    const callbackPath = callbackPathFor(config, location);
    if (url.pathname === callbackPath) {
      return safeReturnPath(url.searchParams.get('returnPath'), url.origin);
    }
    return safeReturnPath(
      `${url.pathname}${url.search}${url.hash}`,
      url.origin,
    );
  } catch {
    return '/';
  }
}

function restoreAttemptKey(clientId: string): string {
  return `platform-sdk:oidc:${clientId}${RESTORE_ATTEMPT_SUFFIX}`;
}

function hasRestoreAttempt(storage: StorageLike | null, key: string): boolean {
  if (!storage) {
    return false;
  }
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function markRestoreAttempt(storage: StorageLike | null, key: string): void {
  try {
    storage?.setItem(key, '1');
  } catch {
    // The SDK will surface storage failures through its normal auth snapshot.
  }
}

function clearRestoreAttempt(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Storage is best-effort; clearing a marker must never break sign-out.
  }
}

interface RuntimeTransaction {
  mode?: unknown;
  returnPath?: unknown;
}

/**
 * The SDK owns the transaction format. This narrow storage decorator only
 * replaces the SDK's restore default of `/` with the route that was visible
 * when the silent restore started; interactive transactions remain untouched.
 */
function createRuntimeStorage(config: OidcAuthConfig): {
  storage: StorageLike | null;
  transactionKey: string;
} {
  const source = config.storage ?? browserStorage();
  const transactionKey = `platform-sdk:oidc:${config.clientId}:transaction`;
  if (!source) {
    return { storage: null, transactionKey };
  }

  const location = locationFor(config);
  return {
    transactionKey,
    storage: {
      getItem: key => source.getItem(key),
      setItem: (key, value) => {
        let nextValue = value;
        if (key === transactionKey) {
          try {
            const transaction = JSON.parse(value) as RuntimeTransaction;
            if (transaction.mode === 'restore') {
              nextValue = JSON.stringify({
                ...transaction,
                returnPath: currentReturnPath(config, location),
              });
            }
          } catch {
            // Preserve the SDK's original value if its transaction is invalid.
          }
        }
        source.setItem(key, nextValue);
      },
      removeItem: key => source.removeItem(key),
    },
  };
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function isDiscoveryRequest(
  input: RequestInfo | URL,
  issuerUrl: string,
): boolean {
  try {
    const requested = new URL(requestUrl(input), issuerUrl).toString();
    const discovery = new URL(
      `${issuerUrl.replace(/\/+$/, '')}/.well-known/openid-configuration`,
    ).toString();
    return requested === discovery;
  } catch {
    return false;
  }
}

/**
 * A failed restore must not cause an explicit sign-in to start another
 * `prompt=none` redirect. The first discovery call is the SDK's restore
 * boundary, so make that one call fail locally; the subsequent interactive
 * sign-in discovery proceeds normally.
 */
function fetchWithoutSilentRestore(config: OidcAuthConfig): typeof fetch {
  let suppressDiscovery = true;
  const originalFetch =
    config.fetch ??
    (typeof globalThis.fetch === 'function'
      ? globalThis.fetch.bind(globalThis)
      : undefined);

  return async (input, init) => {
    if (suppressDiscovery && isDiscoveryRequest(input, config.issuerUrl)) {
      suppressDiscovery = false;
      throw new Error(SILENT_RESTORE_SUPPRESSED);
    }
    if (!originalFetch) {
      throw new Error('OIDC authentication requires browser fetch support.');
    }
    return originalFetch(input, init);
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The identity provider could not complete this action.';
}

function sanitizeSignInOptions(
  options: AuthSignInOptions | undefined,
  origin = browserOrigin(),
): AuthSignInOptions | undefined {
  if (!options || options.returnPath === undefined) {
    return options;
  }
  return { ...options, returnPath: safeReturnPath(options.returnPath, origin) };
}

/**
 * Delays local OIDC construction until the runtime has selected a host
 * adapter. It also gives a failed silent restore a stable signed-out/error
 * state with an explicit interactive retry path.
 */
class DeferredOidcAuthAdapter implements AuthAdapter {
  private readonly config: OidcAuthConfig;
  private readonly storage: StorageLike | null;
  private readonly restoreKey: string;
  private readonly runtimeConfig: OidcAuthConfig;
  private readonly listeners = new Set<() => void>();
  private delegate: AuthAdapter | undefined;
  private unsubscribeDelegate: (() => void) | undefined;
  private snapshot: AuthSnapshot | null = null;

  constructor(config: OidcAuthConfig) {
    this.config = config;
    const runtimeStorage = createRuntimeStorage(config);
    this.storage = runtimeStorage.storage;
    this.restoreKey = restoreAttemptKey(config.clientId);
    this.runtimeConfig = {
      ...config,
      storage: this.storage ?? undefined,
    };

    const location = locationFor(config);
    if (
      this.storage &&
      !hasAuthorizationCallback(location) &&
      hasRestoreAttempt(this.storage, this.restoreKey)
    ) {
      this.snapshot = {
        isAuthenticated: false,
        user: null,
        phase: 'error',
        error:
          'The previous sign-in session could not be restored. Sign in again.',
      };
      return;
    }

    const delegate = this.createDelegate(false);
    this.attach(delegate);
    if (this.storage && !hasAuthorizationCallback(location)) {
      markRestoreAttempt(this.storage, this.restoreKey);
    }
  }

  getSnapshot = (): AuthSnapshot | null => this.snapshot;

  subscribe = (onChange: () => void): (() => void) => {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  };

  signIn = async (options?: AuthSignInOptions): Promise<void> => {
    clearRestoreAttempt(this.storage, this.restoreKey);
    try {
      if (!this.delegate) {
        this.attach(this.createDelegate(true));
      }
      const delegate = this.delegate;
      if (!delegate) {
        throw new Error('The identity provider could not be initialized.');
      }
      await delegate.signIn(
        sanitizeSignInOptions(options, locationFor(this.config)?.origin),
      );
    } catch (error) {
      if (!this.delegate) {
        this.setSnapshot({
          isAuthenticated: false,
          user: null,
          phase: 'error',
          error: errorMessage(error),
        });
      }
      throw error;
    }
  };

  signOut = async (): Promise<void> => {
    clearRestoreAttempt(this.storage, this.restoreKey);
    if (!this.delegate) {
      this.setSnapshot({ isAuthenticated: false, user: null, phase: 'idle' });
      return;
    }
    await this.delegate.signOut();
  };

  getAccessToken = (options?: AuthAccessTokenOptions): Promise<string | null> =>
    readAccessToken(this.delegate, options);

  handleUnauthorized = (): void => {
    this.delegate?.handleUnauthorized?.();
  };

  private createDelegate(suppressSilentRestore: boolean): AuthAdapter {
    return createOidcAuthAdapter(
      suppressSilentRestore
        ? {
            ...this.runtimeConfig,
            fetch: fetchWithoutSilentRestore(this.runtimeConfig),
          }
        : this.runtimeConfig,
    );
  }

  private attach(delegate: AuthAdapter): void {
    this.unsubscribeDelegate?.();
    this.delegate = delegate;
    this.snapshot = delegate.getSnapshot();
    this.unsubscribeDelegate = delegate.subscribe(() => {
      const nextSnapshot = delegate.getSnapshot();
      this.snapshot = nextSnapshot;
      if (nextSnapshot?.isAuthenticated) {
        clearRestoreAttempt(this.storage, this.restoreKey);
      }
      this.notify();
    });
    this.notify();
  }

  private setSnapshot(snapshot: AuthSnapshot | null): void {
    this.snapshot = snapshot;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/**
 * Creates the generated app's local auth fallback. The factory is exported
 * for focused generated-skeleton tests; normal boot calls it lazily through
 * `configurePlatformAuth` after runtime/host detection.
 */
export function createApplicationAuthAdapter(
  authEnvironment: AuthEnvironment = env.auth,
): AuthAdapter {
  if (authEnvironment.status === 'unconfigured') {
    return createStandaloneAuthAdapter();
  }
  if (authEnvironment.status === 'invalid' || !authEnvironment.config) {
    return createStandaloneAuthAdapter(
      authEnvironment.error ?? 'Authentication configuration is invalid.',
    );
  }
  try {
    return new DeferredOidcAuthAdapter(authEnvironment.config);
  } catch (error) {
    return createStandaloneAuthAdapter(errorMessage(error));
  }
}

/**
 * Stable adapter identity used by both PlatformProvider and the generated API
 * client. It starts with an unavailable placeholder and never constructs
 * local OIDC before the host/runtime decision is complete.
 */
class DelegatingAuthAdapter implements AuthAdapter {
  private delegate: AuthAdapter = createStandaloneAuthAdapter();
  private unsubscribeDelegate: (() => void) | undefined;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.connect(this.delegate);
  }

  getSnapshot = (): ReturnType<AuthAdapter['getSnapshot']> =>
    this.delegate.getSnapshot();

  subscribe = (onChange: () => void): (() => void) => {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  };

  signIn = (options?: AuthSignInOptions): Promise<void> =>
    this.delegate.signIn(sanitizeSignInOptions(options));

  signOut = (): Promise<void> => this.delegate.signOut();

  getAccessToken = (options?: AuthAccessTokenOptions): Promise<string | null> =>
    readAccessToken(this.delegate, options);

  handleUnauthorized = (): void => {
    this.delegate.handleUnauthorized?.();
  };

  configure(delegate: AuthAdapter): void {
    if (delegate === this || delegate === this.delegate) {
      return;
    }
    this.unsubscribeDelegate?.();
    this.delegate = delegate;
    this.connect(delegate);
    this.notify();
  }

  private connect(delegate: AuthAdapter): void {
    this.unsubscribeDelegate = delegate.subscribe(() => this.notify());
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Stable object consumed by the generated React tree and API transport. */
export const appAuthAdapter: AuthAdapter = new DelegatingAuthAdapter();

/**
 * Select a host adapter before creating the local fallback. Omitting the
 * argument intentionally means "use the generated standalone/OIDC fallback";
 * it does not mean "create OIDC before host detection".
 */
export function configurePlatformAuth(adapter?: AuthAdapter): void {
  const selected =
    adapter && adapter !== appAuthAdapter
      ? adapter
      : createApplicationAuthAdapter();
  (appAuthAdapter as DelegatingAuthAdapter).configure(selected);
}

/** Used by the generated API transport without coupling product code to React hooks. */
export async function getPlatformAccessToken(
  options?: AuthAccessTokenOptions,
): Promise<string | null> {
  return readAccessToken(appAuthAdapter, options);
}

/** Lets the API boundary surface a backend-rejected credential to the auth UX. */
export function handlePlatformUnauthorized(): void {
  appAuthAdapter.handleUnauthorized?.();
}
