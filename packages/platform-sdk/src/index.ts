// Keep this barrel intentionally small - it IS the platform contract.

export { PlatformProvider } from './provider.js';
export type { PlatformProviderConfig } from './provider.js';

export { usePlatformApp } from './hooks/use-platform-app.js';
export { usePlatformRuntime } from './hooks/use-platform-runtime.js';
export { useAuth } from './hooks/use-auth.js';
export { usePermissions } from './hooks/use-permissions.js';
export { useTenant } from './hooks/use-tenant.js';
export { useNavigation } from './hooks/use-navigation.js';

export type {
  RuntimeMode,
  PlatformAppIdentity,
  PlatformRuntimeInfo,
  PlatformUser,
  AuthState,
  PermissionsState,
  TenantState,
  NavigationState,
} from './types.js';

export type {
  AuthAdapter,
  PermissionsAdapter,
  TenantAdapter,
  NavigationAdapter,
  PlatformAdapters,
} from './adapters/types.js';

export {
  createStandaloneAuthAdapter,
  createStandalonePermissionsAdapter,
  createStandaloneTenantAdapter,
  createStandaloneNavigationAdapter,
} from './adapters/standalone.js';

export {
  PlatformCapabilityUnavailableError,
  PlatformRuntimeUnavailableError,
} from './errors.js';

export {
  detectPlatformHost,
  PLATFORM_HOST_GLOBAL,
} from './runtime/host-contract.js';
export type { PlatformHostContext } from './runtime/host-contract.js';

export { resolvePlatformRuntime } from './runtime/resolve.js';
export type { ResolvedPlatformRuntime } from './runtime/resolve.js';
