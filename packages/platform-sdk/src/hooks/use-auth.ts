import { useSyncExternalStore } from 'react';

import { usePlatformContext } from '../provider.js';
import type { AuthState } from '../types.js';

/** Auth/session state. `status` is "unavailable" when no auth provider is configured. */
export function useAuth(): AuthState {
  const { adapters } = usePlatformContext('useAuth');
  const snapshot = useSyncExternalStore(
    adapters.auth.subscribe,
    adapters.auth.getSnapshot,
  );

  if (!snapshot) {
    return {
      status: 'unavailable',
      reason: 'No authentication provider is configured for this application.',
      isAuthenticated: false,
      user: null,
      signIn: adapters.auth.signIn,
      signOut: adapters.auth.signOut,
    };
  }

  return {
    status: 'ready',
    isAuthenticated: snapshot.isAuthenticated,
    user: snapshot.user,
    signIn: adapters.auth.signIn,
    signOut: adapters.auth.signOut,
  };
}
