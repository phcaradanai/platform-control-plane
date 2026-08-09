import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  initObservability,
  resetObservabilityForTests,
  setObservabilitySink,
  trackEvent,
} from './init';

describe('observability capability', () => {
  afterEach(() => {
    resetObservabilityForTests();
  });

  it('routes trackEvent through the active sink', () => {
    const sink = vi.fn();
    setObservabilitySink(sink);

    trackEvent('demo-event', { foo: 'bar' });

    expect(sink).toHaveBeenCalledWith({
      name: 'demo-event',
      detail: { foo: 'bar' },
    });
  });

  it('reports an initialization event and captures uncaught errors once installed', () => {
    const sink = vi.fn();
    setObservabilitySink(sink);

    initObservability();
    expect(sink).toHaveBeenCalledWith({
      name: 'observability-initialized',
      detail: undefined,
    });

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        filename: 'app.tsx',
        lineno: 42,
      }),
    );

    expect(sink).toHaveBeenCalledWith({
      name: 'uncaught-error',
      detail: { message: 'boom', source: 'app.tsx', line: 42 },
    });
  });

  it('is idempotent - calling initObservability twice installs listeners once', () => {
    const sink = vi.fn();
    setObservabilitySink(sink);

    initObservability();
    initObservability();
    sink.mockClear();

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));

    expect(sink).toHaveBeenCalledTimes(1);
  });
});
