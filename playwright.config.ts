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

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 60_000,

  expect: {
    timeout: 30_000,
  },

  // Start the backend and frontend for the smoke tests. The same
  // two-process startup that is the documented Windows workflow is used
  // everywhere (CI and local) so the tests always run against a real,
  // freshly-started instance. `reuseExistingServer` lets a developer with
  // an already-running backend/frontend skip the restart.
  webServer: [
    {
      command: 'node .yarn/releases/yarn-4.13.0.cjs workspace backend start',
      url: 'http://localhost:7007/.backstage/health/v1/readiness',
      reuseExistingServer: true,
      // First start compiles the backend in dev mode; allow generous time
      // on cold machines/CI before the readiness endpoint returns 200.
      timeout: 300_000,
    },
    {
      command: 'node .yarn/releases/yarn-4.13.0.cjs workspace app start',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 300_000,
    },
  ],

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  reporter: [['html', { open: 'never', outputFolder: 'e2e-test-report' }]],

  use: {
    actionTimeout: 0,
    baseURL:
      process.env.PLAYWRIGHT_URL ?? 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  outputDir: 'node_modules/.cache/e2e-test-results',

  projects: generateProjects(), // Find all packages with e2e-test folders
});
