import type {
  HistoryDataSource,
  HistoryEvent,
  HistoryPage,
  HistoryQuery,
} from './contract.js';

export const sampleHistoryCategories: readonly string[] = [
  'Configuration',
  'Workflow',
  'Access',
];

const sampleHistoryEvents: readonly HistoryEvent[] = [
  {
    id: 'history-001',
    timestamp: '2026-08-14T08:42:00.000Z',
    timestampLabel: 'Today, 08:42 UTC',
    summary: 'Application preferences updated',
    description: 'A preference change was accepted by the application.',
    actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
    source: 'Application',
    category: 'Configuration',
    status: 'success',
    details: [
      { label: 'Change', value: 'Display preferences' },
      { label: 'Reference', value: 'preferences-2026-08-14' },
    ],
  },
  {
    id: 'history-002',
    timestamp: '2026-08-14T08:27:00.000Z',
    timestampLabel: 'Today, 08:27 UTC',
    summary: 'Record review started',
    description: 'A review workflow is waiting for the next step.',
    actor: { id: 'user:default/grace', label: 'Grace Hopper' },
    source: 'Workflow service',
    category: 'Workflow',
    status: 'pending',
    details: [
      { label: 'Review scope', value: 'Current working set' },
      { label: 'Next step', value: 'Awaiting reviewer input' },
    ],
  },
  {
    id: 'history-003',
    timestamp: '2026-08-14T07:55:00.000Z',
    timestampLabel: 'Today, 07:55 UTC',
    summary: 'Data refresh completed',
    description: 'The latest available snapshot finished processing.',
    actor: { id: 'service:refresh', label: 'Refresh service' },
    source: 'Platform service',
    category: 'Workflow',
    status: 'success',
    details: [
      { label: 'Result', value: 'Snapshot available' },
      { label: 'Duration', value: '42 seconds' },
    ],
  },
  {
    id: 'history-004',
    timestamp: '2026-08-13T16:10:00.000Z',
    timestampLabel: 'Yesterday, 16:10 UTC',
    summary: 'Access request was not completed',
    description:
      'The request could not be completed by the available provider.',
    actor: { id: 'user:default/katherine', label: 'Katherine Johnson' },
    source: 'Access service',
    category: 'Access',
    status: 'failed',
    details: [
      { label: 'Outcome', value: 'Provider response unavailable' },
      { label: 'Recovery', value: 'Try again when the provider is available' },
    ],
  },
  {
    id: 'history-005',
    timestamp: '2026-08-13T14:45:00.000Z',
    timestampLabel: 'Yesterday, 14:45 UTC',
    summary: 'Workspace opened',
    description: 'A user opened the application workspace.',
    actor: { id: 'user:default/alan', label: 'Alan Turing' },
    source: 'Application',
    category: 'Access',
    status: 'info',
    details: [{ label: 'Entry point', value: 'Application navigation' }],
  },
  {
    id: 'history-006',
    timestamp: '2026-08-13T10:15:00.000Z',
    timestampLabel: 'Yesterday, 10:15 UTC',
    summary: 'Configuration validation completed',
    actor: { id: 'service:validation', label: 'Validation service' },
    source: 'Platform service',
    category: 'Configuration',
    status: 'success',
    details: [{ label: 'Result', value: 'No blocking issues found' }],
  },
  {
    id: 'history-007',
    timestamp: '2026-08-12T11:30:00.000Z',
    timestampLabel: '12 Aug 2026, 11:30 UTC',
    summary: 'Workflow step queued',
    actor: { id: 'service:workflow', label: 'Workflow service' },
    source: 'Workflow service',
    category: 'Workflow',
    status: 'pending',
    details: [{ label: 'Queue', value: 'Standard processing' }],
  },
  {
    id: 'history-008',
    timestamp: '2026-08-12T09:05:00.000Z',
    timestampLabel: '12 Aug 2026, 09:05 UTC',
    summary: 'Application preferences viewed',
    actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
    source: 'Application',
    category: 'Configuration',
    status: 'info',
    details: [{ label: 'Section', value: 'Appearance' }],
  },
];

function matches(event: HistoryEvent, query: HistoryQuery): boolean {
  const search = query.search.trim().toLowerCase();
  const haystack = [
    event.summary,
    event.description,
    event.actor?.label,
    event.source,
    event.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    (search.length === 0 || haystack.includes(search)) &&
    (query.category === 'all' || event.category === query.category) &&
    (query.status === 'all' || event.status === query.status)
  );
}

/** Clearly illustrative source used until an application supplies its API. */
export const sampleHistoryDataSource: HistoryDataSource = {
  list: async query => {
    const filtered = sampleHistoryEvents.filter(event => matches(event, query));
    const offset = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const start = Number.isNaN(offset) ? 0 : offset;
    const items = filtered.slice(start, start + query.pageSize);
    const nextCursor =
      start + query.pageSize < filtered.length
        ? String(start + query.pageSize)
        : null;

    const page: HistoryPage = {
      items,
      totalCount: filtered.length,
      nextCursor,
    };
    return page;
  },
};
