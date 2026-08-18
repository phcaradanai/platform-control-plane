import { History as HistoryIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  ApplicationPage,
  Badge,
  Button,
  DataTable,
  DetailList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  LoadingState,
  PageHeader,
  PageSection,
  SearchFilterToolbar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui';
import type { DataTableColumn } from '@platform/ui';

import type {
  HistoryDataSource,
  HistoryEvent,
  HistoryQuery,
  HistoryStatus,
} from './contract.js';
import { sampleHistoryCategories, sampleHistoryDataSource } from './sample.js';
import type { FeaturePack } from '../contract.js';

export interface HistoryScreenProps {
  dataSource?: HistoryDataSource;
}

const INITIAL_QUERY: HistoryQuery = {
  search: '',
  category: 'all',
  status: 'all',
  cursor: null,
  pageSize: 5,
};

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function statusVariant(
  status: HistoryStatus,
): 'success' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'destructive';
  if (status === 'pending') return 'secondary';
  return 'outline';
}

function HistoryDetails({ event }: { event: HistoryEvent }) {
  return (
    <DetailList
      columns={2}
      items={[
        { id: 'summary', label: 'Summary', value: event.summary },
        { id: 'timestamp', label: 'Timestamp', value: event.timestamp },
        {
          id: 'actor',
          label: 'Actor',
          value: event.actor?.label ?? 'Not provided',
        },
        {
          id: 'source',
          label: 'Source',
          value: event.source ?? 'Not provided',
        },
        { id: 'category', label: 'Category', value: event.category },
        {
          id: 'status',
          label: 'Status',
          value: (
            <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
          ),
        },
        ...(event.details ?? []).map(detail => ({
          id: `detail-${detail.label}`,
          label: detail.label,
          value: detail.value,
        })),
      ]}
    />
  );
}

export function HistoryScreen({
  dataSource = sampleHistoryDataSource,
}: HistoryScreenProps = {}) {
  const [query, setQuery] = useState<HistoryQuery>(INITIAL_QUERY);
  const [cursorStack, setCursorStack] = useState<readonly (string | null)[]>(
    [],
  );
  const [selectedEvent, setSelectedEvent] = useState<HistoryEvent | null>(null);

  const historyQuery = useQuery({
    queryKey: ['feature-pack', 'history', query],
    queryFn: ({ signal }) => dataSource.list(query, signal),
    retry: false,
  });

  const updateFilters = (
    updates: Partial<Pick<HistoryQuery, 'search' | 'category' | 'status'>>,
  ) => {
    setCursorStack([]);
    setQuery(current => ({ ...current, ...updates, cursor: null }));
  };

  const nextPage = () => {
    const nextCursor = historyQuery.data?.nextCursor;
    if (!nextCursor) return;
    setCursorStack(current => [...current, query.cursor]);
    setQuery(current => ({ ...current, cursor: nextCursor }));
  };

  const previousPage = () => {
    if (cursorStack.length === 0) return;
    const previous = cursorStack[cursorStack.length - 1] ?? null;
    setCursorStack(current => current.slice(0, -1));
    setQuery(current => ({ ...current, cursor: previous }));
  };

  const categories = useMemo(() => sampleHistoryCategories, []);
  const page = historyQuery.data;
  const columns: readonly DataTableColumn<HistoryEvent>[] = [
    {
      id: 'timestamp',
      header: 'When',
      cell: event => (
        <time
          dateTime={event.timestamp}
          className="whitespace-nowrap text-muted-foreground"
        >
          {event.timestampLabel ?? event.timestamp}
        </time>
      ),
    },
    {
      id: 'summary',
      header: 'Activity',
      cell: event => (
        <div className="min-w-48 space-y-1">
          <p className="font-medium">{event.summary}</p>
          {event.description ? (
            <p className="text-sm leading-5 text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: 'actor',
      header: 'Actor / source',
      cell: event => (
        <div className="min-w-32 space-y-1">
          <p>{event.actor?.label ?? 'System'}</p>
          <p className="text-sm text-muted-foreground">
            {event.source ?? 'Not provided'}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: event => (
        <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: event => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`View details for ${event.summary}`}
          onClick={() => setSelectedEvent(event)}
        >
          View details
        </Button>
      ),
    },
  ];

  return (
    <ApplicationPage>
      <PageHeader
        title="History"
        description="A chronological activity view for records supplied by an application or domain service. History is operational context, not the authoritative source of truth."
        status={<Badge variant="outline">Illustrative event source</Badge>}
      />

      <PageSection
        title="Activity history"
        description="Search and filter events, then inspect the details returned with each record. Pagination keeps large histories predictable on narrow screens."
      >
        <SearchFilterToolbar
          aria-label="Search activity history"
          search={
            <div className="grid gap-2">
              <Label htmlFor="history-search">Search history</Label>
              <Input
                id="history-search"
                value={query.search}
                placeholder="Activity, actor, source, or category"
                onChange={event =>
                  updateFilters({ search: event.target.value })
                }
              />
            </div>
          }
          filters={
            <>
              <div className="grid min-w-40 gap-2">
                <Label htmlFor="history-category">Category</Label>
                <Select
                  value={query.category}
                  onValueChange={category => updateFilters({ category })}
                >
                  <SelectTrigger id="history-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-36 gap-2">
                <Label htmlFor="history-status">Status</Label>
                <Select
                  value={query.status}
                  onValueChange={status =>
                    updateFilters({ status: status as HistoryQuery['status'] })
                  }
                >
                  <SelectTrigger id="history-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          }
          resultSummary={
            page ? `${page.totalCount} matching events` : undefined
          }
          onClear={() =>
            updateFilters({ search: '', category: 'all', status: 'all' })
          }
          clearDisabled={
            query.search.length === 0 &&
            query.category === 'all' &&
            query.status === 'all'
          }
        />

        {historyQuery.isPending ? (
          <LoadingState label="Loading activity history" />
        ) : historyQuery.isError ? (
          <ErrorState
            title="History unavailable"
            message={errorMessage(historyQuery.error)}
            retryLabel="Retry history"
            onRetry={() => void historyQuery.refetch()}
          />
        ) : !page || page.items.length === 0 ? (
          <EmptyState
            title="No activity matches these filters"
            description="Try clearing a filter or return later when the application has activity to show."
          />
        ) : (
          <>
            <DataTable
              caption="Activity history"
              items={page.items}
              columns={columns}
              getRowId={event => event.id}
              className="max-h-[32rem] overflow-auto"
            />
            <div
              className="flex flex-wrap items-center justify-between gap-3"
              role="group"
              aria-label="History pagination"
            >
              <p className="text-sm text-muted-foreground">
                Showing {page.items.length} of {page.totalCount} events
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cursorStack.length === 0}
                  onClick={previousPage}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!page.nextCursor}
                  onClick={nextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </PageSection>

      <Dialog
        open={selectedEvent !== null}
        onOpenChange={open => !open && setSelectedEvent(null)}
      >
        {selectedEvent ? (
          <DialogContent
            closeLabel="Close activity details"
            className="max-h-[85vh] overflow-y-auto"
          >
            <DialogTitle>Activity details</DialogTitle>
            <DialogDescription>
              Details supplied by the history data source for this event.
            </DialogDescription>
            <div className="pt-4">
              <HistoryDetails event={selectedEvent} />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </ApplicationPage>
  );
}

export const historyFeaturePack = {
  id: 'history',
  route: '/history',
  navigation: {
    label: 'History',
    description: 'Chronological application activity.',
    icon: HistoryIcon,
  },
  screen: HistoryScreen,
  dependencies: {
    platform: ['@platform/ui'],
  },
} satisfies FeaturePack;
