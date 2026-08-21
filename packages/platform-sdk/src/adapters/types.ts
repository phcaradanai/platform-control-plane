import type {
  AuthPhase,
  AuthSignInOptions,
  PermissionId,
  PlatformUser,
} from '../types.js';

/**
 * Adapters are the extension point between the SDK's stable hook contracts and
 * whatever actually backs them in a given environment: the standalone defaults
 * (see `./standalone.js`), or a platform host's own adapters supplied via
 * `PlatformHostContext.adapters` (see `../runtime/host-contract.ts`).
 * A `getSnapshot()` of `null` means the capability is unavailable; hooks turn
 * that into the `status: 'unavailable'` shape their consumers see.
 *
 * Every `getSnapshot()` below is read through React's `useSyncExternalStore`,
 * which re-renders whenever the returned reference changes (`Object.is`) -
 * not whenever its contents change. Returning a fresh object literal on every
 * call, even with identical values, causes an infinite render loop, not just
 * a wasted one. Cache and return the same object until something actually
 * changes (see `./standalone.js`'s navigation adapter for the pattern).
 */
export interface AuthAdapter {
  getSnapshot: () => {
    isAuthenticated: boolean;
    user: PlatformUser | null;
    /** Optional for backwards-compatible host adapters; defaults to `idle`. */
    phase?: AuthPhase;
    error?: string;
  } | null;
  subscribe: (onChange: () => void) => () => void;
  signIn: (options?: AuthSignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns a current bearer token for an API request, when the provider supports it. */
  getAccessToken?: (options?: AuthAccessTokenOptions) => Promise<string | null>;
  /** Marks the local session expired after an API rejects its credential. */
  handleUnauthorized?: () => void;
}

/** Cancellation context for a bearer-token lookup or refresh. */
export interface AuthAccessTokenOptions {
  signal?: AbortSignal;
}

export interface PermissionsAdapter {
  getSnapshot: () => { can: (permissionId: PermissionId) => boolean } | null;
  subscribe: (onChange: () => void) => () => void;
}

export interface TenantAdapter {
  getSnapshot: () => { tenantId: string; tenantName: string } | null;
  subscribe: (onChange: () => void) => () => void;
}

/**
 * Deliberately router-agnostic: the SDK ships a `window.history`-based default
 * (see `./standalone.js`) and consuming apps may supply their own adapter that
 * bridges to whichever router they use instead.
 */
export interface NavigationAdapter {
  navigate: (path: string) => void;
  getSnapshot: () => { currentPath: string };
  subscribe: (onChange: () => void) => () => void;
}

export interface PlatformAdapters {
  auth: AuthAdapter;
  permissions: PermissionsAdapter;
  tenant: TenantAdapter;
  navigation: NavigationAdapter;
}
