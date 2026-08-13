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

import { test, expect, type Page } from '@playwright/test';

const CAPABILITIES = [
  'authentication',
  'profile',
  'rbac',
  'dashboard',
  'settings',
  'reports',
  'history',
  'audit-log',
  'notifications',
  'tenant',
  'theme',
  'i18n',
  'observability',
  'desktop-ready',
  'mobile-ready',
];

async function clickNext(page: Page) {
  const next = page.getByRole('button', { name: /next/i }).first();
  await expect(next).toBeEnabled({ timeout: 90_000 });
  await next.scrollIntoViewIfNeeded();
  // The Backstage stepper can continue reflowing while async field state
  // settles. The enabled assertion above guards the interaction contract;
  // force only skips Playwright's transient stability check on this real
  // production button.
  await next.click({ force: true });
}

test('Create page lists the Platform MFE Application template', async ({
  page,
}) => {
  await page.goto('/create', { waitUntil: 'commit' });
  await page
    .getByRole('button', { name: /enter/i })
    .click({ timeout: 90_000 })
    .catch(() => {});

  await expect(
    page.getByRole('heading', { name: 'Platform MFE Application' }),
  ).toBeVisible({ timeout: 90_000 });
});

test('Platform MFE Application form renders and progresses through every step', async ({
  page,
}, testInfo) => {
  const appName = `smoke-form-check-${testInfo.repeatEachIndex}-${
    Date.now() % 100000
  }`;

  await page.goto('/create/templates/default/platform-mfe-app', {
    waitUntil: 'commit',
  });
  await page
    .getByRole('button', { name: /enter/i })
    .click({ timeout: 90_000 })
    .catch(() => {});

  await expect(
    page.getByRole('heading', { name: 'Platform MFE Application' }),
  ).toBeVisible({ timeout: 90_000 });

  // --- Step 1: Application identity ---
  await expect(page.getByLabel(/^Name/)).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toBeVisible();
  await expect(page.getByLabel(/^Description/)).toBeVisible();
  const identityOwner = page.getByRole('textbox', { name: 'Owner' });
  await expect(identityOwner).toBeVisible();

  await page.getByLabel(/^Name/).fill(appName);
  await page.getByLabel(/^Title/).fill('Smoke Form Check');
  await identityOwner.click();
  await identityOwner.fill('platform-team');
  await expect(
    page.getByRole('option', { name: 'platform-team' }),
  ).toBeVisible();
  await page.getByRole('option', { name: 'platform-team' }).click();
  await clickNext(page);

  // --- Step 2: Repository (repoUrl, repoVisibility) ---
  await expect(page.getByText('Repository Location')).toBeVisible();
  await expect(page.getByText('Repository Visibility')).toBeVisible();
  await expect(
    page.getByText('private', { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText('public', { exact: false }).first(),
  ).toBeVisible();

  const repositoryOwnerInput = page.getByRole('textbox', {
    name: 'Owner',
    exact: true,
  });
  const repositoryInput = page.getByRole('textbox', {
    name: 'Repository',
    exact: true,
  });
  // RepoUrlPicker mounts its autocomplete controls after the repository
  // integration request completes. Wait for real editability before typing,
  // instead of treating visible-but-not-ready inputs as usable.
  await expect(repositoryOwnerInput).toBeEditable({ timeout: 90_000 });
  await expect(repositoryInput).toBeEditable({ timeout: 90_000 });
  await repositoryOwnerInput.fill('phcaradanai');
  await repositoryOwnerInput.blur();
  await expect(repositoryInput).toBeEditable({ timeout: 90_000 });
  await repositoryInput.fill(appName);
  // RepoUrlPicker uses a free-form autocomplete. Leaving the field commits
  // the typed value into the field's form state before the stepper advances.
  await repositoryInput.blur();
  await expect(repositoryInput).toHaveValue(appName);

  await clickNext(page);

  // --- Step 3: Application metadata (lifecycle, mode) ---
  await expect(page.getByText('Lifecycle')).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('Application mode')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'experimental' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'production' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'platform-mfe' })).toBeVisible();
  await expect(
    page.getByRole('radio', { name: 'standalone', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('radio', { name: 'standalone-and-mfe' }),
  ).toBeVisible();

  // The template defaults are part of the form contract; assert them rather
  // than clicking an already-selected, visually-hidden radio input.
  await expect(
    page.getByRole('radio', { name: 'experimental' }),
  ).toBeChecked();
  await expect(
    page.getByRole('radio', { name: 'platform-mfe' }),
  ).toBeChecked();
  await clickNext(page);

  // --- Step 4: Capabilities ---
  await expect(
    page.getByText('Requested capabilities', { exact: true }),
  ).toBeVisible();
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(CAPABILITIES.length);
  for (const capability of CAPABILITIES) {
    await expect(
      page.getByRole('checkbox', { name: capability, exact: true }),
    ).toBeVisible();
  }
});
