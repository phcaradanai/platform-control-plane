/**
 * Where this app is currently executing. Distinct from `PlatformAppIdentity.mode`
 * (a scaffold-time choice recorded in `platform-app.json`, e.g. "platform-mfe"):
 * `runtimeMode` is the live environment, only ever "standalone" until a
 * platform-hosted shell exists to report "hosted".
 */
export type RuntimeMode = 'standalone' | 'hosted';

/** Read-through view of the application's `platform-app.json`, as recorded by the scaffolder. */
export interface PlatformAppIdentity {
  id: string;
  title: string;
  owner: string;
  mode: 'platform-mfe' | 'standalone' | 'standalone-and-mfe';
  capabilities: string[];
}

export interface PlatformRuntimeInfo {
  runtimeMode: RuntimeMode;
}

export interface PlatformUser {
  id: string;
  displayName?: string;
  email?: string;
}

export interface AuthState {
  status: 'ready' | 'unavailable';
  /** Present only when `status` is "unavailable"; explains why, for user-facing fallback UI. */
  reason?: string;
  isAuthenticated: boolean;
  user: PlatformUser | null;
  /** Rejects with {@link PlatformCapabilityUnavailableError} when `status` is "unavailable". */
  signIn: () => Promise<void>;
  /** Rejects with {@link PlatformCapabilityUnavailableError} when `status` is "unavailable". */
  signOut: () => Promise<void>;
}

export interface PermissionsState {
  status: 'ready' | 'unavailable';
  reason?: string;
  /** Fails closed: always returns `false` when `status` is "unavailable". */
  can: (permissionId: string) => boolean;
}

export interface TenantState {
  status: 'ready' | 'unavailable';
  reason?: string;
  tenantId: string | null;
  tenantName: string | null;
}

export interface NavigationState {
  currentPath: string;
  navigate: (path: string) => void;
}
