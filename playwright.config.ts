/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { defineConfig } from '@playwright/test';
import { generateProjects } from '@backstage/e2e-test-utils/playwright';

const baseURL = process.env.PLAYWRIGHT_URL ?? 'http://localhost:7007';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // The production app bundle can take time to hydrate on a cold checkout.
  // This is a test budget for startup only; assertions retain their semantic
  // checks and explicit per-expectation timeouts.
  timeout: 180_000,

  expect: {
    timeout: 90_000,
  },

  // Build the real frontend once, then let the Backstage app backend serve
  // that production bundle. This keeps browser verification independent of
  // Rspack's dev-server compilation and prevents an optional developer-only
  // app-config.local.yaml from introducing database or OAuth requirements.
  webServer: {
    command:
      'node .yarn/releases/yarn-4.13.0.cjs workspace app build --config ../../app-config.yaml && node .yarn/releases/yarn-4.13.0.cjs workspace backend start --config ../../app-config.yaml',
    url: 'http://localhost:7007/.backstage/health/v1/readiness',
    reuseExistingServer: true,
    timeout: 600_000,
  },

  forbidOnly: !!process.env.CI,

  // The smoke suite exercises one large Backstage bundle. Serializing the
  // browser contexts prevents concurrent cold tabs from competing with
  // startup and makes the run deterministic without reducing coverage.
  workers: 1,

  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { open: 'never', outputFolder: 'e2e-test-report' }]],

  use: {
    actionTimeout: 0,
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  outputDir: 'node_modules/.cache/e2e-test-results',

  projects: generateProjects(), // Find all packages with e2e-test folders
});
