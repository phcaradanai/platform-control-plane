import { expect, test } from '@playwright/test';

// The scaffolded app renders the generated title in index.html, so this
// assertion verifies the whole render chain, not just a hardcoded string.
const APP_TITLE = '${{ values.title }}';

test('app boots and shows the generated title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(APP_TITLE);
  await expect(
    page.getByRole('heading', { name: APP_TITLE, level: 1 }),
  ).toBeVisible();
});

test('theme toggle switches to dark and persists', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');

  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Persisted across a reload (localStorage).
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Back to light for the remaining tests.
  await page.getByRole('radio', { name: 'Light' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
});

test('table demo renders virtualized rows and sorts', async ({ page }) => {
  await page.goto('/table');
  await expect(
    page.getByRole('heading', { name: 'Table demo', level: 1 }),
  ).toBeVisible();

  const table = page.getByRole('table', { name: 'Demo data' });
  await expect(table).toBeVisible();
  // Virtualization renders the header plus a viewport-full of rows.
  expect(await table.getByRole('row').count()).toBeGreaterThan(5);

  // First data row is visible (virtualization measured it).
  await expect(table.getByText('Ava 1')).toBeVisible();

  // Sort by Amount descending and confirm the header state flips.
  await page.getByRole('button', { name: 'Sort by Amount' }).click();
  await expect(table.getByRole('row').nth(1)).toContainText('$9,');
});

test('form demo validates and submits', async ({ page }) => {
  await page.goto('/form');
  await expect(
    page.getByRole('heading', { name: 'Form demo', level: 1 }),
  ).toBeVisible();

  // Empty submit shows inline validation errors (name, email, role).
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('alert')).toHaveCount(3);
  await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Choose a role' }),
  ).toBeVisible();

  // Fill valid values; role error clears after choosing one.
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
  await page.getByLabel('Role').click();
  await page.getByRole('option', { name: 'Editor' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Form submitted')).toBeVisible();
});

test('unknown route renders the not-found page', async ({ page }) => {
  await page.goto('/definitely-not-a-route');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL(/\/$/);
});
