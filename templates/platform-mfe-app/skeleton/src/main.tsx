import '@fontsource-variable/inter';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import './styles/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Importing for the side effect of validating VITE_* env vars at boot; a
// malformed value throws here with a readable message before any UI mounts.
import './lib/env';
import { App } from './app';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
