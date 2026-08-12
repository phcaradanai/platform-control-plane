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
  await page.getByRole('button', { name: /next/i }).first().click();
}

test('Create page lists the Platform MFE Application template', async ({
  page,
}) => {
  await page.goto('/create');
  await page
    .getByRole('button', { name: /enter/i })
    .click()
    .catch(() => {});

  await expect(
    page.getByRole('heading', { name: 'Platform MFE Application' }),
  ).toBeVisible({ timeout: 30_000 });
});

test('Platform MFE Application form renders and progresses through every step', async ({
  page,
}, testInfo) => {
  const appName = `smoke-form-check-${testInfo.repeatEachIndex}-${
    Date.now() % 100000
  }`;

  await page.goto('/create/templates/default/platform-mfe-app');
  await page
    .getByRole('button', { name: /enter/i })
    .click()
    .catch(() => {});

  await expect(
    page.getByRole('heading', { name: 'Platform MFE Application' }),
  ).toBeVisible({ timeout: 30_000 });

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

  await page
    .getByRole('textbox', { name: 'Owner', exact: true })
    .fill('phcaradanai');
  await page
    .getByRole('textbox', { name: 'Repository', exact: true })
    .fill(appName);

  // RepoUrlPicker validates repository availability against GitHub
  // asynchronously; give it time to settle before advancing, and retry
  // once if the first Next lands on a stale validation error.
  await page.waitForTimeout(2500);
  await clickNext(page);
  await page.waitForTimeout(1000);
  if (
    !(await page
      .getByText('Lifecycle')
      .isVisible()
      .catch(() => false))
  ) {
    await clickNext(page);
  }

  // --- Step 3: Application metadata (lifecycle, mode) ---
  await expect(page.getByText('Lifecycle')).toBeVisible({ timeout: 15_000 });
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

  await page
    .getByRole('radio', { name: 'experimental' })
    .check({ force: true });
  await page
    .getByRole('radio', { name: 'platform-mfe' })
    .check({ force: true });
  await clickNext(page);

  // --- Step 4: Capabilities ---
  await expect(
    page.getByText('Requested capabilities', { exact: true }),
  ).toBeVisible();
  const checkboxes = page.getByRole('checkbox');
  await expect(checkboxes).toHaveCount(CAPABILITIES.length);
  for (const capability of CAPABILITIES) {
    await expect(page.getByText(capability, { exact: true })).toBeVisible();
  }
});
