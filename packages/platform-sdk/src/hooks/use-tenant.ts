import { useSyncExternalStore } from 'react';

import { usePlatformContext } from '../provider.js';
import type { TenantState } from '../types.js';

/** Tenant context. `status` is "unavailable" when no tenant provider is configured. */
export function useTenant(): TenantState {
  const { adapters } = usePlatformContext('useTenant');
  const snapshot = useSyncExternalStore(
    adapters.tenant.subscribe,
    adapters.tenant.getSnapshot,
  );

  if (!snapshot) {
    return {
      status: 'unavailable',
      reason: 'No tenant provider is configured for this application.',
      tenantId: null,
      tenantName: null,
    };
  }

  return {
    status: 'ready',
    tenantId: snapshot.tenantId,
    tenantName: snapshot.tenantName,
  };
}
