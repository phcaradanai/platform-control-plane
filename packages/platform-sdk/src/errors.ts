/** Thrown by a capability's action methods (e.g. `signIn`) when no provider backs it. */
export class PlatformCapabilityUnavailableError extends Error {
  constructor(public readonly capability: string, reason: string) {
    super(`Platform capability "${capability}" is unavailable: ${reason}`);
    this.name = 'PlatformCapabilityUnavailableError';
  }
}
