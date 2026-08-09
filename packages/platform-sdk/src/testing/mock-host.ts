import {
  PLATFORM_HOST_GLOBAL,
  type PlatformHostContext,
} from '../runtime/host-contract.js';

/**
 * Unit-test-only harness for simulating a platform host, so hosted-mode
 * behavior is testable without the real Super App runtime. Writes to
 * `globalThis[PLATFORM_HOST_GLOBAL]` in the current JS realm - this works
 * from a jsdom/happy-dom unit test (`window === globalThis`), but **not**
 * from Playwright/Node-driven browser automation, where the page runs in a
 * separate realm from the test script. For that, construct the host object
 * directly inside a `page.addInitScript()` body instead, keyed by the same
 * `"__PLATFORM_HOST__"` string.
 */
export function installMockPlatformHost(
  context: Partial<Omit<PlatformHostContext, 'contractVersion'>> = {},
): () => void {
  const target = globalThis as unknown as Record<string, unknown>;
  const previous = target[PLATFORM_HOST_GLOBAL];
  const host: PlatformHostContext = { contractVersion: 1, ...context };
  target[PLATFORM_HOST_GLOBAL] = host;
  return () => {
    if (previous === undefined) {
      delete target[PLATFORM_HOST_GLOBAL];
    } else {
      target[PLATFORM_HOST_GLOBAL] = previous;
    }
  };
}

/** Removes any installed mock host, regardless of what installed it. */
export function uninstallMockPlatformHost(): void {
  delete (globalThis as unknown as Record<string, unknown>)[
    PLATFORM_HOST_GLOBAL
  ];
}
