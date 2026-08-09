import '@fontsource-variable/inter';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import '@platform/ui/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PlatformRuntimeUnavailableError } from '@platform/sdk';

// Importing for the side effect of validating VITE_* env vars at boot; a
// malformed value throws here with a readable message before any UI mounts.
import './lib/env';
import { App } from './app';
import { RuntimeUnavailable } from './components/feedback/runtime-unavailable';
import { resolveAppRuntime } from './lib/platform-runtime';
{% if 'observability' in values.capabilities %}
// `observability` capability (see src/capabilities/observability/): installs
// window error/rejection capture before the app mounts.
import { initObservability } from './capabilities/observability/init';
{% endif %}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found in index.html');
}
{% if 'observability' in values.capabilities %}
initObservability();
{% endif %}

const root = createRoot(container);

// Resolves platform-app.json's `mode` against whatever platform host (real,
// or in tests a mock - see docs/platform-sdk.md) is present at boot. A
// "platform-mfe" app with no host fails clearly here instead of mounting a
// broken app - see src/lib/platform-runtime.ts.
try {
  const runtime = resolveAppRuntime();
  root.render(
    <StrictMode>
      <App runtime={runtime} />
    </StrictMode>,
  );
} catch (error) {
  if (error instanceof PlatformRuntimeUnavailableError) {
    root.render(<RuntimeUnavailable message={error.message} />);
  } else {
    throw error;
  }
}
