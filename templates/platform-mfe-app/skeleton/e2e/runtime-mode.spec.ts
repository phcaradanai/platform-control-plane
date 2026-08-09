import { expect, test, type Page } from '@playwright/test';

// Exercises the real runtime-mode boundary (src/lib/platform-runtime.ts,
// @platform/sdk's resolvePlatformRuntime/detectPlatformHost) against this
// app's actual generated `mode`. Each test is only meaningful for a subset
// of modes and skips itself otherwise - a given generated app only ever
// runs the tests relevant to its own scaffolded mode. See
// docs/adr/0005-runtime-mode-boundary.md.
// Explicitly typed `string`, not inferred as a literal - otherwise TS
// narrows APP_MODE to whichever single mode this app was generated with,
// and flags every comparison against the *other* modes below as a
// same-file "no overlap" error (TS2367).
const APP_MODE: string = '${{ values.mode }}';

// No real Super App host exists yet - this is the "lightweight harness"
// for hosted behavior: a minimal object matching @platform/sdk's host
// contract, installed before the page's own scripts run. Built entirely
// inside the init-script body (not passed as an argument) because
// `page.addInitScript` serializes its argument, and adapter functions
// aren't serializable.
async function installMockHost(page: Page) {
  await page.addInitScript(() => {
    // getSnapshot must return a stable (Object.is-equal) reference across
    // calls when nothing changed - useSyncExternalStore re-renders on every
    // change in identity, so a fresh object literal per call is an infinite
    // render loop, not just a wasted render (see
    // src/lib/platform-navigation-adapter.ts for the same rule applied to
    // the standalone default). Cache it once, outside getSnapshot.
    const snapshot = {
      isAuthenticated: true,
      user: { id: 'e2e-host-user', displayName: 'E2E Host User' },
    };
    (window as unknown as Record<string, unknown>).__PLATFORM_HOST__ = {
      contractVersion: 1,
      adapters: {
        auth: {
          getSnapshot: () => snapshot,
          subscribe: () => () => {},
          signIn: () => Promise.resolve(),
          signOut: () => Promise.resolve(),
        },
      },
    };
  });
}

function runtimeModeCell(page: Page) {
  return page.locator('dt:has-text("Runtime mode") + dd');
}

function authCell(page: Page) {
  return page.locator('dt:has-text("Auth") + dd');
}

test('shows a clear fallback with no platform host, when mode requires one', async ({ page }) => {
  test.skip(APP_MODE !== 'platform-mfe', 'only "platform-mfe" mode requires a host to boot');

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Platform host required', level: 1 }),
  ).toBeVisible();
  await expect(page.getByText(/requires running inside a platform host/)).toBeVisible();
});

test('renders normally with no platform host, when mode does not require one', async ({ page }) => {
  test.skip(APP_MODE === 'platform-mfe', 'this mode requires a host to boot - see the fallback test above');

  await page.goto('/');
  await expect(runtimeModeCell(page)).toHaveText('standalone');
  await expect(authCell(page)).toHaveText('unavailable');
});

test('reports hosted and uses host-supplied adapters when a platform host is present', async ({ page }) => {
  test.skip(APP_MODE === 'standalone', '"standalone" mode never uses a host, even if present');

  await installMockHost(page);
  await page.goto('/');
  await expect(runtimeModeCell(page)).toHaveText('hosted');
  await expect(authCell(page)).toHaveText('authenticated');
});

test('ignores a present platform host in "standalone" mode', async ({ page }) => {
  test.skip(APP_MODE !== 'standalone', 'only meaningful for "standalone" mode');

  await installMockHost(page);
  await page.goto('/');
  await expect(runtimeModeCell(page)).toHaveText('standalone');
  await expect(authCell(page)).toHaveText('unavailable');
});
