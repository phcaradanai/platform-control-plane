import type {
  ReportDefinition,
  ReportResult,
  ReportsDataSource,
} from './contract.js';

export const sampleReportDefinitions: readonly ReportDefinition[] = [
  {
    id: 'work-overview',
    name: 'Work overview',
    description: 'A neutral summary of records and their current state.',
    category: 'Overview',
    parameters: [
      {
        id: 'time-range',
        label: 'Time range',
        kind: 'select',
        defaultValue: 'recent',
        options: [
          { value: 'recent', label: 'Recent activity' },
          { value: 'quarter', label: 'Current quarter' },
        ],
      },
      {
        id: 'scope',
        label: 'Scope',
        kind: 'text',
        description: 'Optional scope or collection identifier.',
        defaultValue: 'All available records',
      },
    ],
  },
  {
    id: 'change-summary',
    name: 'Change summary',
    description: 'A neutral view of changes grouped by status and source.',
    category: 'Activity',
    parameters: [
      {
        id: 'status',
        label: 'Status',
        kind: 'select',
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All statuses' },
          { value: 'open', label: 'Open' },
          { value: 'complete', label: 'Complete' },
        ],
      },
    ],
  },
  {
    id: 'activity-detail',
    name: 'Activity detail',
    description: 'A larger result view for reviewing event-level information.',
    category: 'Activity',
    parameters: [
      {
        id: 'source',
        label: 'Source',
        kind: 'text',
        defaultValue: 'All sources',
      },
    ],
  },
];

const sampleResultRows = Array.from({ length: 24 }, (_, index) => ({
  id: `sample-row-${index + 1}`,
  values: {
    record: `Record ${String(index + 1).padStart(2, '0')}`,
    state: index % 4 === 0 ? 'Needs review' : 'Ready',
    source: index % 2 === 0 ? 'Application' : 'Platform service',
    updated: `${index + 1} minutes ago`,
  },
}));

const sampleResult: ReportResult = {
  reportId: 'work-overview',
  generatedAt: '2026-08-14T08:30:00.000Z',
  generatedAtLabel: '14 Aug 2026, 08:30 UTC',
  columns: [
    { id: 'record', label: 'Record' },
    { id: 'state', label: 'State' },
    { id: 'source', label: 'Source' },
    { id: 'updated', label: 'Updated' },
  ],
  rows: sampleResultRows,
  totalCount: 128,
  hasMore: true,
};

/** Clearly illustrative source used until an application supplies its API. */
export const sampleReportsDataSource: ReportsDataSource = {
  listReports: async () => sampleReportDefinitions,
  runReport: async query => ({
    ...sampleResult,
    reportId: query.reportId,
  }),
};
