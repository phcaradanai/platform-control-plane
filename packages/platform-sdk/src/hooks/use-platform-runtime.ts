import { usePlatformContext } from '../provider.js';
import type { PlatformRuntimeInfo } from '../types.js';

/** Where this app is currently executing (standalone vs. platform-hosted). Always available. */
export function usePlatformRuntime(): PlatformRuntimeInfo {
  const { runtimeMode } = usePlatformContext('usePlatformRuntime');
  return { runtimeMode };
}
