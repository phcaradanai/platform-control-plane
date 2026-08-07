import { Alert } from '@material-ui/lab';
import { useEffect, useState } from 'react';
import { AppRootElementBlueprint, configApiRef, useApi } from '@backstage/frontend-plugin-api';

const CHECK_INTERVAL_MS = 15_000;
const REQUEST_TIMEOUT_MS = 5_000;

/**
 * Polls the backend's built-in readiness endpoint
 * (GET {backend.baseUrl}/.backstage/health/v1/readiness) and renders a
 * full-width warning banner while the backend is unavailable. The banner
 * appears at the very top of the app, outside the page layout, so the
 * frontend never presents itself as healthy while the APIs it needs
 * (catalog, scaffolder, auth) are unreachable.
 *
 * Uses plain `fetch` rather than the Backstage FetchApi: the readiness
 * endpoint is unauthenticated, and FetchApi layers identity/discovery
 * machinery that can hang before sign-in completes.
 */
export function BackendStatusBannerContent() {
  const config = useApi(configApiRef);
  const [backendAvailable, setBackendAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;

    const backendUrl = config.getString('backend.baseUrl');
    const readinessUrl = `${backendUrl}/.backstage/health/v1/readiness`;

    const check = async () => {
      controller?.abort();
      controller = new AbortController();
      const timeout = setTimeout(
        () => controller?.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        const response = await fetch(readinessUrl, {
          signal: controller.signal,
        });
        // 200 = fully started; anything else (503 during startup, network
        // failure, non-2xx) counts as unavailable.
        if (active) {
          setBackendAvailable(response.ok);
        }
      } catch {
        if (active) {
          setBackendAvailable(false);
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
      controller?.abort();
    };
  }, [config]);

  if (backendAvailable) {
    return null;
  }

  return (
    <Alert
      severity="error"
      role="alert"
      style={{
        borderRadius: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1301,
      }}
    >
      Backend unavailable — Catalog and Create require the backend API.
      Start it with <code>yarn workspace backend start</code>.
    </Alert>
  );
}

/**
 * App-root element: rendered once at the app root, outside the page
 * layout, so the banner is visible on every page.
 */
export const BackendStatusBanner = AppRootElementBlueprint.make({
  name: 'backend-status',
  params: {
    element: <BackendStatusBannerContent />,
  },
});
