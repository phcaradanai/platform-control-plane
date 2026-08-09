import type { PlatformAdapters } from '../adapters/types.js';
import { PlatformRuntimeUnavailableError } from '../errors.js';
import type { PlatformAppIdentity, RuntimeMode } from '../types.js';
import type { PlatformHostContext } from './host-contract.js';

export interface ResolvedPlatformRuntime {
  runtimeMode: RuntimeMode;
  /** Present only when a host was detected and used. */
  adapters?: Partial<PlatformAdapters>;
}

/**
 * Decides this application's live runtime context from its scaffold-time
 * `mode` (`platform-app.json`) and whatever platform host, if any, was
 * detected (see `detectPlatformHost`). This is the one place that gives
 * `mode` real behavior:
 *
 * - `"standalone"` never uses a host, even if one happens to be present -
 *   otherwise it would be indistinguishable from `"standalone-and-mfe"`.
 * - `"platform-mfe"` requires a host; throws {@link PlatformRuntimeUnavailableError}
 *   when none is present, so callers can fail clearly instead of mounting a
 *   broken app.
 * - `"standalone-and-mfe"` uses a host when present, and falls back to
 *   standalone when not.
 */
export function resolvePlatformRuntime(
  mode: PlatformAppIdentity['mode'],
  host: PlatformHostContext | null,
): ResolvedPlatformRuntime {
  switch (mode) {
    case 'standalone':
      return { runtimeMode: 'standalone' };
    case 'platform-mfe':
      if (!host) {
        throw new PlatformRuntimeUnavailableError(mode);
      }
      return { runtimeMode: 'hosted', adapters: host.adapters };
    case 'standalone-and-mfe':
      return host
        ? { runtimeMode: 'hosted', adapters: host.adapters }
        : { runtimeMode: 'standalone' };
    default:
      // platform-app.json is hand-editable after generation, so this is a
      // real boundary against a malformed/unknown mode, not a can't-happen branch.
      throw new Error(`Unknown platform-app.json mode: "${String(mode)}"`);
  }
}
