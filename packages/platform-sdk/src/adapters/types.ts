import type { PlatformUser } from '../types.js';

/**
 * Adapters are the extension point between the SDK's stable hook contracts and
 * whatever actually backs them in a given environment: nothing yet in standalone
 * mode (see `./standalone.js`), and — in a future phase — a platform-hosted shell.
 * A `getSnapshot()` of `null` means the capability is unavailable; hooks turn
 * that into the `status: 'unavailable'` shape their consumers see.
 */
export interface AuthAdapter {
  getSnapshot: () => {
    isAuthenticated: boolean;
    user: PlatformUser | null;
  } | null;
  subscribe: (onChange: () => void) => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface PermissionsAdapter {
  getSnapshot: () => { can: (permissionId: string) => boolean } | null;
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
