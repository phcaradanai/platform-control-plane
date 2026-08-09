import type { NavigationAdapter } from '@platform/sdk';
import { router } from '../router';

/**
 * Bridges @platform/sdk's router-agnostic navigation contract to this app's
 * actual router (TanStack Router), via its underlying history instance
 * rather than `router.navigate()` - `history.push` takes a raw string path,
 * sidestepping TanStack Router's typed-route `to` overloads that a
 * router-agnostic adapter has no way to satisfy.
 */
export function createRouterNavigationAdapter(): NavigationAdapter {
  // Cache the snapshot object so getSnapshot() returns a stable reference
  // when the path hasn't changed - useSyncExternalStore compares by
  // Object.is and treats a new object each call as a change, even with
  // identical contents.
  let snapshot = { currentPath: router.history.location.href };

  return {
    navigate: path => {
      router.history.push(path);
    },
    getSnapshot: () => {
      const currentPath = router.history.location.href;
      if (currentPath !== snapshot.currentPath) {
        snapshot = { currentPath };
      }
      return snapshot;
    },
    subscribe: onChange => router.history.subscribe(onChange),
  };
}
