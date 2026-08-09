/**
 * The `observability` capability's composed effect: capture unhandled
 * client errors and expose a small, explicit tracking hook for
 * feature code to report events. This has no backend of its own - `sink`
 * defaults to `console`, so wiring a real collector later means swapping
 * one function, not re-plumbing call sites.
 *
 * Deliberately dependency-free (no new npm package): this skeleton ships a
 * frozen `package-lock.json` for a reproducible `npm ci`, so composed
 * capabilities may add files but not dependencies - see
 * docs/capabilities.md.
 */
export interface ObservabilityEvent {
  name: string;
  detail?: Record<string, unknown>;
}

export type ObservabilitySink = (event: ObservabilityEvent) => void;

let activeSink: ObservabilitySink = event => {
  console.info('[observability]', event.name, event.detail ?? {});
};

let listenerController: AbortController | null = null;

/** Swap the sink (e.g. to forward events to a real collector). Mainly for tests. */
export function setObservabilitySink(sink: ObservabilitySink): void {
  activeSink = sink;
}

/** Report a single observability event through the active sink. */
export function trackEvent(name: string, detail?: Record<string, unknown>): void {
  activeSink({ name, detail });
}

/**
 * Installs `window.onerror` / `unhandledrejection` listeners that funnel
 * uncaught errors through the same sink as `trackEvent`. Safe to call once
 * per page load; `main.tsx` calls this at boot when the capability is
 * selected.
 */
export function initObservability(): void {
  if (listenerController || typeof window === 'undefined') {
    return;
  }
  listenerController = new AbortController();
  const { signal } = listenerController;

  window.addEventListener(
    'error',
    event => {
      trackEvent('uncaught-error', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
      });
    },
    { signal },
  );

  window.addEventListener(
    'unhandledrejection',
    event => {
      trackEvent('unhandled-rejection', {
        reason: event.reason instanceof Error ? event.reason.message : String(event.reason),
      });
    },
    { signal },
  );

  trackEvent('observability-initialized');
}

/** @internal test-only reset of module state between test cases. */
export function resetObservabilityForTests(): void {
  listenerController?.abort();
  listenerController = null;
  activeSink = () => {};
}
