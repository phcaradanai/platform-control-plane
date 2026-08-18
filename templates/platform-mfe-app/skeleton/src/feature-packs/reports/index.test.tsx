import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PlatformProvider, type PermissionsAdapter } from '@platform/sdk';

import { appInfo } from '../../lib/app-info';
import type { ReportDefinition, ReportsDataSource } from './contract';
import { ReportsScreen } from './index';

function renderReports(
  dataSource?: ReportsDataSource,
  permissions?: PermissionsAdapter,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <PlatformProvider config={{ app: appInfo, adapters: { permissions } }}>
      <QueryClientProvider client={queryClient}>
        <ReportsScreen dataSource={dataSource} />
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

const report: ReportDefinition = {
  id: 'report-1',
  name: 'Example report',
  description: 'A report fixture.',
  category: 'Overview',
  parameters: [],
};

describe('reports feature pack', () => {
  it('loads the catalog, runs a report, and renders a bounded result table', async () => {
    const user = userEvent.setup();
    const source: ReportsDataSource = {
      listReports: async () => [report],
      runReport: async query => ({
        reportId: query.reportId,
        generatedAt: '2026-08-14T08:30:00.000Z',
        columns: [{ id: 'value', label: 'Value' }],
        rows: [{ id: 'row-1', values: { value: 'Ready' } }],
        totalCount: 1,
      }),
    };

    renderReports(source);

    await screen.findByRole('button', { name: /Run report/ });
    await user.click(screen.getByRole('button', { name: 'Run report' }));

    expect(await screen.findByText('Result set')).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Report results' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('keeps export behind the permission and data-source boundaries', async () => {
    const user = userEvent.setup();
    const requestExport = vi.fn().mockResolvedValue({ fileName: 'report.csv' });
    const source: ReportsDataSource = {
      listReports: async () => [report],
      runReport: async query => ({
        reportId: query.reportId,
        generatedAt: '2026-08-14T08:30:00.000Z',
        columns: [{ id: 'value', label: 'Value' }],
        rows: [{ id: 'row-1', values: { value: 'Ready' } }],
        totalCount: 1,
      }),
      requestExport,
    };
    const permissionsSnapshot = {
      can: (permission: string) => permission === 'reports.export',
    };
    const permissions: PermissionsAdapter = {
      getSnapshot: () => permissionsSnapshot,
      subscribe: () => () => {},
    };

    renderReports(source, permissions);
    await screen.findByRole('button', { name: /Run report/ });
    await user.click(screen.getByRole('button', { name: 'Run report' }));
    await screen.findByText('Result set');
    await user.click(screen.getByRole('button', { name: 'Export result' }));

    expect(requestExport).toHaveBeenCalledOnce();
    expect(
      await screen.findByText('Export requested: report.csv.'),
    ).toBeInTheDocument();
  });

  it('renders a recoverable catalog error', async () => {
    const source: ReportsDataSource = {
      listReports: async () => {
        throw new Error('Reporting service offline');
      },
      runReport: async () => {
        throw new Error('not reached');
      },
    };

    renderReports(source);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reporting service offline',
    );
    expect(
      screen.getByRole('button', { name: 'Retry catalog' }),
    ).toBeInTheDocument();
  });
});
