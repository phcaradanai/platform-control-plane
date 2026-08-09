import { useSyncExternalStore } from 'react';

import { usePlatformContext } from '../provider.js';
import type { PermissionsState } from '../types.js';

// Module-scoped so the unavailable branch returns a referentially stable
// function across renders, matching the ready branch's stable `snapshot.can`.
const DENY_ALL = () => false;

/** Permission checks. Fails closed: `can()` returns `false` while `status` is "unavailable". */
export function usePermissions(): PermissionsState {
  const { adapters } = usePlatformContext('usePermissions');
  const snapshot = useSyncExternalStore(
    adapters.permissions.subscribe,
    adapters.permissions.getSnapshot,
  );

  if (!snapshot) {
    return {
      status: 'unavailable',
      reason: 'No permissions provider is configured for this application.',
      can: DENY_ALL,
    };
  }

  return {
    status: 'ready',
    can: snapshot.can,
  };
}
