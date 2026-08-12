import { expect, test } from '@playwright/test';

{% if 'dashboard' in values.capabilities %}
test('Dashboard pack composes its route and navigation', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Dashboard', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Dashboard' }),
  ).toBeVisible();
  await expect(page.getByText('Illustrative data')).toBeVisible();
});
{% else %}
test('Dashboard pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

{% if 'settings' in values.capabilities %}
test('Settings pack composes its route and navigation', async ({ page }) => {
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Settings' }),
  ).toBeVisible();
  await expect(page.getByText('Local preferences')).toBeVisible();
});
{% else %}
test('Settings pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/settings');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}
