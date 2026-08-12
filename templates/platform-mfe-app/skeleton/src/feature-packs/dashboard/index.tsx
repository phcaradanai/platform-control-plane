import { LayoutDashboard } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  ApplicationPage,
  Badge,
  Button,
  DataTable,
  PageHeader,
  PageSection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui';
import type { DataTableColumn } from '@platform/ui';

import type { FeaturePack } from '../contract.js';

const metricRows = [
  { label: 'Active work', value: '24', detail: '+8% from the previous period' },
  { label: 'Completed', value: '18', detail: '75% of active work' },
  { label: 'Needs review', value: '4', detail: '2 updated today' },
  { label: 'People involved', value: '12', detail: 'Across 3 teams' },
] as const;

const activityRows = [
  {
    id: 'workspace',
    item: 'Application platform',
    owner: 'Platform team',
    status: 'Active',
    updated: '12 minutes ago',
  },
  {
    id: 'migration',
    item: 'Identity migration',
    owner: 'Product team',
    status: 'Review',
    updated: 'Yesterday',
  },
  {
    id: 'portal',
    item: 'Design system portal',
    owner: 'Experience team',
    status: 'Active',
    updated: 'Monday',
  },
] as const;

type ActivityRow = (typeof activityRows)[number];

const activityColumns: readonly DataTableColumn<ActivityRow>[] = [
  {
    id: 'item',
    header: 'Work item',
    cell: row => <span className="font-medium">{row.item}</span>,
  },
  {
    id: 'owner',
    header: 'Owner',
    cell: row => <span className="text-muted-foreground">{row.owner}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: row => (
      <Badge variant={row.status === 'Active' ? 'success' : 'secondary'}>
        {row.status}
      </Badge>
    ),
  },
  {
    id: 'updated',
    header: 'Updated',
    cell: row => <span className="text-muted-foreground">{row.updated}</span>,
  },
];

export function DashboardScreen() {
  const [range, setRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      if (refreshTimer.current !== undefined) {
        window.clearTimeout(refreshTimer.current);
      }
    },
    [],
  );

  const refresh = () => {
    setRefreshing(true);
    refreshTimer.current = window.setTimeout(() => {
      setRefreshing(false);
    }, 650);
  };

  return (
    <ApplicationPage>
      <PageHeader
        title="Dashboard"
        description="A neutral overview for an application team. The screen uses local sample data so the composition is immediately useful and easy to replace with a domain contract."
        status={
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Illustrative data</Badge>
            <span aria-live="polite">
              {refreshing ? 'Refreshing sample data…' : 'Updated just now'}
            </span>
          </span>
        }
        actions={
          <Button
            type="button"
            variant="outline"
            disabled={refreshing}
            aria-busy={refreshing}
            onClick={refresh}
          >
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </Button>
        }
      />

      <PageSection
        title="At a glance"
        description="A compact summary area that can be replaced by product-owned metrics without changing the page frame."
      >
        <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {metricRows.map(metric => (
            <div key={metric.label} className="min-w-0 bg-card p-5">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="mt-2 text-2xl font-semibold tracking-tight">
                {metric.value}
              </dd>
              <p className="mt-2 break-words text-sm text-muted-foreground">
                {metric.detail}
              </p>
            </div>
          ))}
        </dl>
      </PageSection>

      <PageSection
        title="Recent activity"
        description="A standard data-page composition with a small, replaceable sample collection."
      >
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Showing the last {range === '7d' ? '7 days' : '30 days'} of sample
            activity.
          </p>
          <div className="grid gap-2 sm:min-w-40">
            <label htmlFor="dashboard-range" className="text-sm font-medium">
              Time range
            </label>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger id="dashboard-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          caption="Recent activity"
          items={activityRows}
          columns={activityColumns}
          getRowId={row => row.id}
        />
      </PageSection>
    </ApplicationPage>
  );
}

export const dashboardFeaturePack = {
  id: 'dashboard',
  route: '/dashboard',
  navigation: {
    label: 'Dashboard',
    description: 'A neutral overview of current work.',
    icon: LayoutDashboard,
  },
  screen: DashboardScreen,
  dependencies: ['@platform/ui'],
} satisfies FeaturePack;
