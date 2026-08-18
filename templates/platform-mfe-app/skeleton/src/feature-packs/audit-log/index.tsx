import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useNavigation } from '@platform/sdk';
import type { PermissionId } from '@platform/sdk';
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

import { AuthGate } from '../authentication';
import { PermissionGuard } from '../rbac';
import type { FeaturePack } from '../contract.js';
import type {
  AuditLogDataSource,
  AuditLogPage,
  AuditLogQuery,
  AuditOutcome,
  AuditRecord,
} from './contract.js';
import { auditOutcomeLabels, sampleAuditLogDataSource } from './sample.js';

export const AUDIT_LOG_PERMISSION = 'audit-log.view' as PermissionId;

export interface AuditLogScreenProps {
  dataSource?: AuditLogDataSource;
}

const INITIAL_QUERY: AuditLogQuery = {
  search: '',
  outcome: 'all',
  cursor: null,
  pageSize: 5,
};

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function outcomeVariant(
  outcome: AuditOutcome,
): 'success' | 'destructive' | 'secondary' {
  if (outcome === 'success') return 'success';
  if (outcome === 'denied') return 'secondary';
  return 'destructive';
}

function AuditRecordDetails({ record }: { record: AuditRecord }) {
  return (
    <DetailList
      columns={2}
      items={[
        { id: 'actor', label: 'Actor', value: record.actor.label },
        { id: 'actor-id', label: 'Actor ID', value: record.actor.id },
        { id: 'action', label: 'Action', value: record.action },
        {
          id: 'resource-type',
          label: 'Resource type',
          value: record.resource.type,
        },
        { id: 'resource', label: 'Resource', value: record.resource.label },
        {
          id: 'reference',
          label: 'Resource reference',
          value: <span className="break-all">{record.resource.reference}</span>,
        },
        { id: 'occurred-at', label: 'Timestamp', value: record.occurredAt },
        {
          id: 'outcome',
          label: 'Outcome',
          value: (
            <Badge variant={outcomeVariant(record.outcome)}>
              {auditOutcomeLabels[record.outcome]}
            </Badge>
          ),
        },
        ...(record.metadata ?? []).map(metadata => ({
          id: `metadata-${metadata.label}`,
          label: metadata.label,
          value: metadata.value,
        })),
      ]}
    />
  );
}

function AuditLogContent({ dataSource }: { dataSource: AuditLogDataSource }) {
  const [query, setQuery] = useState<AuditLogQuery>(INITIAL_QUERY);
  const [cursorStack, setCursorStack] = useState<readonly (string | null)[]>(
    [],
  );
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(
    null,
  );
  const auditQuery = useQuery<AuditLogPage>({
    queryKey: ['feature-pack', 'audit-log', query],
    queryFn: ({ signal }) => dataSource.list(query, signal),
    retry: false,
  });

  const updateFilters = (
    updates: Partial<Pick<AuditLogQuery, 'search' | 'outcome'>>,
  ) => {
    setCursorStack([]);
    setQuery(current => ({ ...current, ...updates, cursor: null }));
  };

  const nextPage = () => {
    const nextCursor = auditQuery.data?.nextCursor;
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

  const page = auditQuery.data;
  const columns: readonly DataTableColumn<AuditRecord>[] = [
    {
      id: 'occurred-at',
      header: 'When',
      cell: record => (
        <time
          dateTime={record.occurredAt}
          className="whitespace-nowrap text-muted-foreground"
        >
          {record.occurredAtLabel ?? record.occurredAt}
        </time>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: record => (
        <span className="min-w-32 break-words">{record.actor.label}</span>
      ),
    },
    {
      id: 'action',
      header: 'Action / resource',
      cell: record => (
        <div className="min-w-48 space-y-1">
          <p className="font-medium">{record.action}</p>
          <p className="break-words text-sm text-muted-foreground">
            {record.resource.label} · {record.resource.reference}
          </p>
        </div>
      ),
    },
    {
      id: 'outcome',
      header: 'Outcome',
      cell: record => (
        <Badge variant={outcomeVariant(record.outcome)}>
          {auditOutcomeLabels[record.outcome]}
        </Badge>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: record => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Inspect audit record ${record.id}`}
          onClick={() => setSelectedRecord(record)}
        >
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <PageSection
      title="Audit records"
      description="Audit Log is a higher-trust inspection surface for records supplied by an audit service. The backend remains responsible for authority, retention, immutability, and any compliance guarantees."
    >
      <SearchFilterToolbar
        aria-label="Search audit log"
        search={
          <div className="grid gap-2">
            <Label htmlFor="audit-log-search">Search audit records</Label>
            <Input
              id="audit-log-search"
              value={query.search}
              placeholder="Actor, action, resource, or reference"
              onChange={event => updateFilters({ search: event.target.value })}
            />
          </div>
        }
        filters={
          <div className="grid min-w-36 gap-2">
            <Label htmlFor="audit-log-outcome">Outcome</Label>
            <Select
              value={query.outcome}
              onValueChange={outcome =>
                updateFilters({ outcome: outcome as AuditLogQuery['outcome'] })
              }
            >
              <SelectTrigger id="audit-log-outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        resultSummary={
          page ? `${page.totalCount} matching audit records` : undefined
        }
        onClear={() => updateFilters({ search: '', outcome: 'all' })}
        clearDisabled={query.search.length === 0 && query.outcome === 'all'}
      />

      {auditQuery.isPending ? (
        <LoadingState label="Loading audit records" />
      ) : auditQuery.isError ? (
        <ErrorState
          title="Audit log unavailable"
          message={errorMessage(auditQuery.error)}
          retryLabel="Retry audit log"
          onRetry={() => void auditQuery.refetch()}
        />
      ) : !page || page.items.length === 0 ? (
        <EmptyState
          title="No audit records match these filters"
          description="Try clearing a filter or return later when the audit service has records to show."
        />
      ) : (
        <>
          <DataTable
            caption="Audit log records"
            items={page.items}
            columns={columns}
            getRowId={record => record.id}
            className="max-h-[32rem] overflow-auto"
          />
          <div
            className="flex flex-wrap items-center justify-between gap-3"
            role="group"
            aria-label="Audit log pagination"
          >
            <p className="text-sm text-muted-foreground">
              Showing {page.items.length} of {page.totalCount} audit records
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

      <Dialog
        open={selectedRecord !== null}
        onOpenChange={open => !open && setSelectedRecord(null)}
      >
        {selectedRecord ? (
          <DialogContent
            closeLabel="Close audit record"
            className="max-h-[85vh] overflow-y-auto"
          >
            <DialogTitle>Audit record details</DialogTitle>
            <DialogDescription>
              Inspection data returned by the configured audit-log boundary.
            </DialogDescription>
            <div className="pt-4">
              <AuditRecordDetails record={selectedRecord} />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </PageSection>
  );
}

export function AuditLogScreen({
  dataSource = sampleAuditLogDataSource,
}: AuditLogScreenProps = {}) {
  const navigation = useNavigation();

  return (
    <ApplicationPage>
      <PageHeader
        title="Audit log"
        description="Inspect higher-trust operational records supplied by an audit service. This frontend does not establish immutability, retention, compliance, or authorization guarantees."
        status={<Badge variant="outline">Backend inspection surface</Badge>}
      />
      <AuthGate returnPath={navigation.currentPath}>
        <PermissionGuard permission={AUDIT_LOG_PERMISSION}>
          <AuditLogContent dataSource={dataSource} />
        </PermissionGuard>
      </AuthGate>
    </ApplicationPage>
  );
}

export const auditLogFeaturePack = {
  id: 'audit-log',
  route: '/audit-log',
  navigation: {
    label: 'Audit log',
    description: 'Inspect higher-trust operational records.',
    icon: ClipboardCheck,
  },
  screen: AuditLogScreen,
  dependencies: {
    platform: ['@platform/ui', '@platform/sdk'],
    featurePacks: ['authentication', 'rbac'],
  },
} satisfies FeaturePack;
