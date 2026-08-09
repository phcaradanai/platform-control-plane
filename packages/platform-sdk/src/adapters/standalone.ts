import { PlatformCapabilityUnavailableError } from '../errors.js';
import type {
  AuthAdapter,
  NavigationAdapter,
  PermissionsAdapter,
  TenantAdapter,
} from './types.js';

const AUTH_UNAVAILABLE =
  'No authentication provider is configured for this application.';

/**
 * Default adapters for standalone mode (no platform-hosted shell). Auth,
 * permissions, and tenant are real capabilities this phase deliberately does
 * not implement (no Keycloak, RBAC backend, or tenant system yet), so they
 * report "unavailable" rather than fabricating a fake session/grant/tenant.
 * Navigation has no such backend dependency, so it works standalone via the
 * browser's own History API.
 */
export function createStandaloneAuthAdapter(): AuthAdapter {
  return {
    getSnapshot: () => null,
    subscribe: () => () => {},
    signIn: () =>
      Promise.reject(
        new PlatformCapabilityUnavailableError('auth', AUTH_UNAVAILABLE),
      ),
    signOut: () =>
      Promise.reject(
        new PlatformCapabilityUnavailableError('auth', AUTH_UNAVAILABLE),
      ),
  };
}

export function createStandalonePermissionsAdapter(): PermissionsAdapter {
  return {
    getSnapshot: () => null,
    subscribe: () => () => {},
  };
}

export function createStandaloneTenantAdapter(): TenantAdapter {
  return {
    getSnapshot: () => null,
    subscribe: () => () => {},
  };
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function createStandaloneNavigationAdapter(): NavigationAdapter {
  // Cache the snapshot object so getSnapshot() returns a stable reference
  // when the path hasn't changed - useSyncExternalStore compares by
  // Object.is and treats a new object each call as a change, even with
  // identical contents.
  let snapshot = { currentPath: currentPath() };

  return {
    navigate: path => {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    getSnapshot: () => {
      const path = currentPath();
      if (path !== snapshot.currentPath) {
        snapshot = { currentPath: path };
      }
      return snapshot;
    },
    subscribe: onChange => {
      window.addEventListener('popstate', onChange);
      return () => window.removeEventListener('popstate', onChange);
    },
  };
}
