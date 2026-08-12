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
// app-config.yaml) and, on a default checkout, no app-config.local.yaml -
// so GitHub is not configured on the backend. This is the real dev server
// + a real browser, not a mocked component render - it proves the sign-in
// page never offers a GitHub button that would fail with "No auth
// provider registered for 'github'" the moment it's clicked (the bug this
// phase fixes), while Guest sign-in stays available. GitHub becoming
// reachable once `auth.localGithubEnabled` + the provider block are
// uncommented in app-config.local.yaml.example is covered by
// packages/app/src/modules/sign-in/SignInPage.test.tsx (component-level,
// since it needs real OAuth credentials this environment doesn't have).
// Production's GitHub-only, no-Guest behavior is covered hermetically in
// packages/template-validation (merged config has no guest provider at
// all) since exercising it live needs a deployed Postgres + real GitHub
// OAuth app, which this phase's tooling doesn't provide yet (see
// docs/getting-started.md).
test('Sign-in page offers Guest only on a default local checkout - no broken GitHub button', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('Guest', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /enter/i })).toBeVisible();

  await expect(page.getByText('GitHub', { exact: true })).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign In' }),
  ).not.toBeVisible();
});
