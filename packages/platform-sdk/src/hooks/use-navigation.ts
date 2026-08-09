import { useSyncExternalStore } from 'react';

import { usePlatformContext } from '../provider.js';
import type { NavigationState } from '../types.js';

/**
 * Navigation, decoupled from any specific router. Always available: defaults
 * to the browser History API standalone, or whatever adapter the host app
 * supplied (e.g. bridged to its own router) via `PlatformProvider`.
 */
export function useNavigation(): NavigationState {
  const { adapters } = usePlatformContext('useNavigation');
  const snapshot = useSyncExternalStore(
    adapters.navigation.subscribe,
    adapters.navigation.getSnapshot,
  );

  return {
    currentPath: snapshot.currentPath,
    navigate: adapters.navigation.navigate,
  };
}
