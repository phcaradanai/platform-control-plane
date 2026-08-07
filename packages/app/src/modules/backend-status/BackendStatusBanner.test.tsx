import { ConfigReader } from '@backstage/config';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { configApiRef } from '@backstage/frontend-plugin-api';
import { render, screen, waitFor } from '@testing-library/react';
import { BackendStatusBannerContent } from './BackendStatusBanner';

function renderBanner(fetchImpl: typeof global.fetch) {
  const config = new ConfigReader({
    backend: { baseUrl: 'http://localhost:7007' },
  });
  return render(
    <TestApiProvider apis={[[configApiRef, config]]}>
      <BackendStatusBannerContent />
    </TestApiProvider>,
  );
}

describe('BackendStatusBannerContent', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('renders a warning banner when the backend readiness endpoint is unavailable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('backend down')) as unknown as typeof fetch;

    renderBanner(global.fetch);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Backend unavailable/);
    });
  });

  it('renders a warning banner when readiness returns a non-OK status (e.g. 503 during startup)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('{"message":"Backend has not started yet","status":"error"}', {
        status: 503,
      }),
    ) as unknown as typeof fetch;

    renderBanner(global.fetch);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Backend unavailable/);
    });
  });

  it('renders nothing while the backend is healthy', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })) as unknown as typeof fetch;

    renderBanner(global.fetch);

    // Wait long enough for the initial check to complete, then assert the
    // banner never appears.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
