import type { PlatformAdapters } from '../adapters/types.js';

/**
 * Well-known global a platform host writes to before this application's own
 * bundle runs, so `detectPlatformHost()` can find it without any coupling to
 * *how* it got there - a `<script>` tag, a Module Federation shared scope, an
 * iframe bridge, or (in tests) `@platform/sdk/testing`. Nothing in this SDK
 * assumes Backstage, webpack, or Module Federation on the other end.
 */
export const PLATFORM_HOST_GLOBAL = '__PLATFORM_HOST__';

/**
 * What a platform host publishes at `window[PLATFORM_HOST_GLOBAL]`.
 * `contractVersion` lets a future incompatible shape be rejected explicitly
 * rather than misread - see `detectPlatformHost`.
 */
export interface PlatformHostContext {
  contractVersion: 1;
  /** Capabilities the host backs. Any adapter it omits keeps its standalone default. */
  adapters?: Partial<PlatformAdapters>;
}

function isPlatformHostContext(value: unknown): value is PlatformHostContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { contractVersion?: unknown }).contractVersion === 1
  );
}

/**
 * Reads and validates the host context, if any. Returns `null` both when no
 * host is present and when something is present but doesn't match a
 * contract version this SDK understands - callers can't distinguish the two
 * and shouldn't need to: either way, there is no usable host.
 */
export function detectPlatformHost(): PlatformHostContext | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const candidate = (window as unknown as Record<string, unknown>)[
    PLATFORM_HOST_GLOBAL
  ];
  return isPlatformHostContext(candidate) ? candidate : null;
}
