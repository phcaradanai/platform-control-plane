/** Thrown by a capability's action methods (e.g. `signIn`) when no provider backs it. */
export class PlatformCapabilityUnavailableError extends Error {
  constructor(public readonly capability: string, reason: string) {
    super(`Platform capability "${capability}" is unavailable: ${reason}`);
    this.name = 'PlatformCapabilityUnavailableError';
  }
}

/**
 * Thrown by `resolvePlatformRuntime` when `platform-app.json`'s `mode` is
 * `"platform-mfe"` - which requires running inside a platform host - and no
 * compatible host was detected. Callers (generated apps' `main.tsx`) are
 * expected to catch this and render a clear fallback instead of mounting a
 * broken app.
 */
export class PlatformRuntimeUnavailableError extends Error {
  constructor(public readonly mode: 'platform-mfe') {
    super(
      `This application's mode is "${mode}", which requires running inside a platform host, ` +
        'but no compatible platform host was detected. ' +
        'Run this application inside a platform-hosted shell, or change platform-app.json\'s ' +
        '"mode" to "standalone" or "standalone-and-mfe" to run it on its own.',
    );
    this.name = 'PlatformRuntimeUnavailableError';
  }
}
