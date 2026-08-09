import {
  detectPlatformHost,
  resolvePlatformRuntime,
  type ResolvedPlatformRuntime,
} from '@platform/sdk';

import { appInfo } from './app-info';

export type { ResolvedPlatformRuntime };

/**
 * Resolves this app's live runtime context from its scaffold-time `mode`
 * (`platform-app.json`) and whatever platform host, if any, is present at
 * boot. Throws `PlatformRuntimeUnavailableError` when `mode` is
 * `"platform-mfe"` and no host was detected - `main.tsx` catches that and
 * renders a fallback instead of mounting a broken app.
 */
export function resolveAppRuntime(): ResolvedPlatformRuntime {
  return resolvePlatformRuntime(appInfo.mode, detectPlatformHost());
}
