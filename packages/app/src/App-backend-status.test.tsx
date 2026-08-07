import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App backend-status integration', () => {
  it('renders the backend unavailable banner when the backend API is unreachable', async () => {
    process.env = {
      NODE_ENV: 'test',
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
          },
          context: 'test',
        },
      ] as any,
    };

    // Force every fetch to fail (backend down).
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('backend down')) as any;

    try {
      const rendered = render(App.createRoot());

      await waitFor(
        () => {
          expect(screen.queryByText(/Backend unavailable/)).not.toBeNull();
        },
        { timeout: 15_000 },
      );
      expect(rendered.baseElement).toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
