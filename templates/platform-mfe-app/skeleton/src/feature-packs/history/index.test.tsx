import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { PlatformProvider } from '@platform/sdk';

import { appInfo } from '../../lib/app-info';
import type { HistoryDataSource } from './contract';
import { HistoryScreen } from './index';

function renderHistory(dataSource: HistoryDataSource) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <PlatformProvider config={{ app: appInfo }}>
      <QueryClientProvider client={queryClient}>
        <HistoryScreen dataSource={dataSource} />
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

const source: HistoryDataSource = {
  list: async () => ({
    items: [
      {
        id: 'history-test-1',
        timestamp: '2026-08-14T08:42:00.000Z',
        summary: 'A record changed',
        actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
        source: 'Application',
        category: 'Configuration',
        status: 'success',
        details: [{ label: 'Reference', value: 'record-1' }],
      },
    ],
    totalCount: 1,
    nextCursor: null,
  }),
};

describe('history feature pack', () => {
  it('renders activity and opens event details', async () => {
    const user = userEvent.setup();
    renderHistory(source);

    expect(await screen.findByText('A record changed')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'View details for A record changed' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Activity details' }),
    ).toBeInTheDocument();
    expect(screen.getByText('record-1')).toBeInTheDocument();
  });

  it('renders an explicit empty state', async () => {
    renderHistory({
      list: async () => ({ items: [], totalCount: 0, nextCursor: null }),
    });

    expect(
      await screen.findByText('No activity matches these filters'),
    ).toBeInTheDocument();
  });

  it('renders a recoverable source error', async () => {
    renderHistory({
      list: async () => {
        throw new Error('History service offline');
      },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'History service offline',
    );
    expect(
      screen.getByRole('button', { name: 'Retry history' }),
    ).toBeInTheDocument();
  });
});
