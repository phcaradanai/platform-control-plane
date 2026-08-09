/*
 * Copyright 2026 The Backstage Authors
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

import { test, expect } from '@playwright/test';

// Local development runs with `auth.environment: development` (see
// app-config.yaml), which packages/app/src/modules/sign-in/SignInPage.tsx
// reads to offer both Guest and GitHub. This is the real dev server + a
// real browser, not a mocked component render - it proves the GitHub
// sign-in option is actually reachable from the sign-in page UI, not only
// configured in the backend. Production's GitHub-only, no-Guest behavior
// is covered hermetically in packages/template-validation (merged config
// has no guest provider at all) since exercising it live needs a deployed
// Postgres + real GitHub OAuth app, which this phase's tooling doesn't
// provide yet (see docs/getting-started.md).
test('Sign-in page offers both GitHub and Guest in local development', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Guest', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible();

  await expect(page.getByText('GitHub', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});
