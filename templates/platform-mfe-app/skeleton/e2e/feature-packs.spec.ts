import { expect, test } from '@playwright/test';

{% if 'authentication' in values.capabilities %}
test('Authentication pack composes its route and unavailable-provider state', async ({ page }) => {
  await page.goto('/authentication');
  await expect(
    page.getByRole('heading', { name: 'Authentication', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Authentication' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Authentication provider unavailable' }),
  ).toBeVisible();
});
{% else %}
test('Authentication pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/authentication');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

{% if 'profile' in values.capabilities %}
test('Profile pack composes its route and auth dependency boundary', async ({ page }) => {
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Profile', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Profile' }),
  ).toBeVisible();
  await expect(page.getByText('Authentication unavailable')).toBeVisible();
});
{% else %}
test('Profile pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

{% if 'rbac' in values.capabilities %}
test('Permission pack composes its route and auth dependency boundary', async ({ page }) => {
  await page.goto('/rbac');
  await expect(
    page.getByRole('heading', { name: 'Permissions', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Permissions' }),
  ).toBeVisible();
  await expect(page.getByText('Authentication unavailable')).toBeVisible();
});
{% else %}
test('Permission pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/rbac');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

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

{% if 'reports' in values.capabilities %}
test('Reports pack composes its catalog and navigation', async ({ page }) => {
  await page.goto('/reports');
  await expect(
    page.getByRole('heading', { name: 'Reports', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Reports' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /^Work overview/ }),
  ).toBeVisible();
});
{% else %}
test('Reports pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/reports');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

{% if 'history' in values.capabilities %}
test('History pack composes its activity view and navigation', async ({ page }) => {
  await page.goto('/history');
  await expect(
    page.getByRole('heading', { name: 'History', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'History' }),
  ).toBeVisible();
  await expect(page.getByText('Application preferences updated')).toBeVisible();
});
{% else %}
test('History pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/history');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}

{% if 'audit-log' in values.capabilities %}
test('Audit Log pack composes its protected inspection route', async ({ page }) => {
  await page.goto('/audit-log');
  await expect(
    page.getByRole('heading', { name: 'Audit log', level: 1 }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'Audit log' }),
  ).toBeVisible();
  await expect(page.getByText('Authentication unavailable')).toBeVisible();
});
{% else %}
test('Audit Log pack is absent when it is not selected', async ({ page }) => {
  await page.goto('/audit-log');
  await expect(
    page.getByRole('heading', { name: 'Page not found', level: 1 }),
  ).toBeVisible();
});
{% endif %}
