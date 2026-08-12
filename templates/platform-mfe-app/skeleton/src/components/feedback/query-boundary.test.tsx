import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { QueryBoundary } from '@platform/ui';

function renderBoundary(query: Parameters<typeof QueryBoundary>[0]['query']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <QueryBoundary
        query={query}
        loadingLabel="Loading data"
        empty={{ title: 'No data' }}
        errorTitle="Load failed"
        retryLabel="Try again"
      >
        {data => <div data-testid="data">{JSON.stringify(data)}</div>}
      </QueryBoundary>
    </QueryClientProvider>,
  );
}

describe('QueryBoundary', () => {
  it('shows the loading state while pending', () => {
    const query = {
      isPending: true,
      isError: false,
      error: null,
      data: undefined,
      refetch: vi.fn(),
    } as unknown as Parameters<typeof QueryBoundary>[0]['query'];
    renderBoundary(query);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the error state with retry on failure', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    const query = {
      isPending: false,
      isError: true,
      error: new Error('boom'),
      data: undefined,
      refetch,
    } as unknown as Parameters<typeof QueryBoundary>[0]['query'];
    renderBoundary(query);
    expect(screen.getByRole('alert')).toHaveTextContent('Load failed');
    screen.getByRole('button', { name: /try again/i }).click();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('shows the empty state for undefined / empty arrays', () => {
    const cases = [undefined, [], { items: [] }];
    for (const data of cases) {
      const query = {
        isPending: false,
        isError: false,
        error: null,
        data,
        refetch: vi.fn(),
      } as unknown as Parameters<typeof QueryBoundary>[0]['query'];
      const { unmount } = renderBoundary(query);
      expect(screen.getByText('No data')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders children with the resolved data', () => {
    const query = {
      isPending: false,
      isError: false,
      error: null,
      data: { ok: true },
      refetch: vi.fn(),
    } as unknown as Parameters<typeof QueryBoundary>[0]['query'];
    renderBoundary(query);
    expect(screen.getByTestId('data')).toHaveTextContent('{"ok":true}');
  });
});

// Keep TS happy about unused import type in this file's scope.
void (null as unknown as ReactNode);
