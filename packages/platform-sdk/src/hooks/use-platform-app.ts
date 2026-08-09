import { usePlatformContext } from '../provider.js';
import type { PlatformAppIdentity } from '../types.js';

/** The application's identity, read from its generated `platform-app.json`. Always available. */
export function usePlatformApp(): PlatformAppIdentity {
  return usePlatformContext('usePlatformApp').app;
}
