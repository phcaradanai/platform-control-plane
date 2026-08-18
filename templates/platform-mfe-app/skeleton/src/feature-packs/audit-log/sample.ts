import type {
  AuditLogDataSource,
  AuditLogPage,
  AuditLogQuery,
  AuditOutcome,
  AuditRecord,
} from './contract.js';

const sampleAuditRecords: readonly AuditRecord[] = [
  {
    id: 'audit-001',
    occurredAt: '2026-08-14T08:44:00.000Z',
    occurredAtLabel: 'Today, 08:44 UTC',
    actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
    action: 'Updated preferences',
    resource: {
      type: 'Preference set',
      label: 'Application preferences',
      reference: 'preferences-2026-08-14',
    },
    outcome: 'success',
    metadata: [
      { label: 'Request ID', value: 'req-7f42' },
      { label: 'Source', value: 'Application UI' },
    ],
  },
  {
    id: 'audit-002',
    occurredAt: '2026-08-14T08:20:00.000Z',
    occurredAtLabel: 'Today, 08:20 UTC',
    actor: { id: 'user:default/grace', label: 'Grace Hopper' },
    action: 'Opened a record',
    resource: {
      type: 'Record',
      label: 'Working record',
      reference: 'record-1042',
    },
    outcome: 'success',
    metadata: [
      { label: 'Request ID', value: 'req-7f18' },
      { label: 'Source', value: 'Application UI' },
    ],
  },
  {
    id: 'audit-003',
    occurredAt: '2026-08-14T07:58:00.000Z',
    occurredAtLabel: 'Today, 07:58 UTC',
    actor: { id: 'user:default/katherine', label: 'Katherine Johnson' },
    action: 'Requested access',
    resource: {
      type: 'Access request',
      label: 'Working set',
      reference: 'access-390',
    },
    outcome: 'denied',
    metadata: [
      { label: 'Request ID', value: 'req-7ee2' },
      { label: 'Source', value: 'Access service' },
    ],
  },
  {
    id: 'audit-004',
    occurredAt: '2026-08-13T17:12:00.000Z',
    occurredAtLabel: 'Yesterday, 17:12 UTC',
    actor: { id: 'service:refresh', label: 'Refresh service' },
    action: 'Completed a refresh',
    resource: {
      type: 'Snapshot',
      label: 'Current snapshot',
      reference: 'snapshot-2026-08-13',
    },
    outcome: 'success',
    metadata: [
      { label: 'Request ID', value: 'job-20b1' },
      { label: 'Source', value: 'Platform service' },
    ],
  },
  {
    id: 'audit-005',
    occurredAt: '2026-08-13T15:03:00.000Z',
    occurredAtLabel: 'Yesterday, 15:03 UTC',
    actor: { id: 'user:default/alan', label: 'Alan Turing' },
    action: 'Submitted a change',
    resource: {
      type: 'Change request',
      label: 'Configuration change',
      reference: 'change-88',
    },
    outcome: 'failure',
    metadata: [
      { label: 'Request ID', value: 'req-7d91' },
      { label: 'Source', value: 'Application UI' },
    ],
  },
  {
    id: 'audit-006',
    occurredAt: '2026-08-12T10:41:00.000Z',
    occurredAtLabel: '12 Aug 2026, 10:41 UTC',
    actor: { id: 'service:validation', label: 'Validation service' },
    action: 'Validated configuration',
    resource: {
      type: 'Configuration',
      label: 'Application configuration',
      reference: 'config-current',
    },
    outcome: 'success',
    metadata: [
      { label: 'Request ID', value: 'job-1ab4' },
      { label: 'Source', value: 'Platform service' },
    ],
  },
];

function matches(record: AuditRecord, query: AuditLogQuery): boolean {
  const search = query.search.trim().toLowerCase();
  const haystack = [
    record.actor.label,
    record.action,
    record.resource.type,
    record.resource.label,
    record.resource.reference,
    record.outcome,
  ]
    .join(' ')
    .toLowerCase();

  return (
    (search.length === 0 || haystack.includes(search)) &&
    (query.outcome === 'all' || record.outcome === query.outcome)
  );
}

/** Clearly illustrative source used until an application supplies its API. */
export const sampleAuditLogDataSource: AuditLogDataSource = {
  list: async query => {
    const filtered = sampleAuditRecords.filter(record =>
      matches(record, query),
    );
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const start = Number.isNaN(offset) ? 0 : offset;
    const items = filtered.slice(start, start + query.pageSize);
    const page: AuditLogPage = {
      items,
      totalCount: filtered.length,
      nextCursor:
        start + query.pageSize < filtered.length
          ? String(start + query.pageSize)
          : null,
    };
    return page;
  },
};

export const auditOutcomeLabels: Readonly<Record<AuditOutcome, string>> = {
  success: 'Success',
  failure: 'Failure',
  denied: 'Denied',
};
