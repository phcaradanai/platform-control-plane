import { Download, FileText, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';

import { usePermissions } from '@platform/sdk';
import type { PermissionId } from '@platform/sdk';
import {
  ApplicationPage,
  Badge,
  Button,
  DataTable,
  DataTableSkeleton,
  EmptyState,
  ErrorState,
  FormPage,
  FormSection,
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
  ReportCell,
  ReportDefinition,
  ReportQuery,
  ReportResult,
  ReportsDataSource,
} from './contract.js';
import { sampleReportsDataSource } from './sample.js';
import type { FeaturePack } from '../contract.js';

export const REPORT_PERMISSION_IDS = {
  export: 'reports.export' as PermissionId,
} as const;

export interface ReportsScreenProps {
  dataSource?: ReportsDataSource;
  /** Used by Portal stories to open the real screen directly on a result. */
  initialQuery?: ReportQuery;
}

type ExportState = 'idle' | 'pending' | 'ready' | 'unavailable' | 'error';

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

function formatCell(value: ReportCell | undefined): string {
  return value === null || value === undefined ? '—' : String(value);
}

function reportResultColumns(
  result: ReportResult,
): readonly DataTableColumn<ReportResult['rows'][number]>[] {
  return result.columns.map(column => ({
    id: column.id,
    header: column.label,
    align: column.align,
    cell: row => formatCell(row.values[column.id]),
  }));
}

function ReportCatalog({
  reports,
  selectedId,
  onSelect,
}: {
  reports: readonly ReportDefinition[];
  selectedId: string | null;
  onSelect: (report: ReportDefinition) => void;
}) {
  return (
    <ol className="grid gap-3" aria-label="Available reports">
      {reports.map(report => {
        const selected = report.id === selectedId;

        return (
          <li key={report.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(report)}
              className={`flex min-h-16 w-full min-w-0 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                selected
                  ? 'border-primary bg-accent'
                  : 'border-border bg-card hover:bg-muted'
              }`}
            >
              <FileText
                className="mt-0.5 size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="break-words font-medium">{report.name}</span>
                  <Badge variant="outline">{report.category}</Badge>
                </span>
                <span className="block break-words text-sm leading-5 text-muted-foreground">
                  {report.description}
                </span>
              </span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {selected ? 'Selected' : 'Select'}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ReportParameterControl({
  report,
  values,
  onChange,
}: {
  report: ReportDefinition;
  values: Readonly<Record<string, string>>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {report.parameters.map(parameter => {
        const value = values[parameter.id] ?? '';

        if (parameter.kind === 'select') {
          return (
            <div key={parameter.id} className="grid min-w-0 gap-2">
              <Label htmlFor={`report-parameter-${parameter.id}`}>
                {parameter.label}
              </Label>
              <Select
                value={value}
                onValueChange={next => onChange(parameter.id, next)}
              >
                <SelectTrigger id={`report-parameter-${parameter.id}`}>
                  <SelectValue
                    placeholder={`Choose ${parameter.label.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(parameter.options ?? []).map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parameter.description ? (
                <p className="text-sm leading-5 text-muted-foreground">
                  {parameter.description}
                </p>
              ) : null}
            </div>
          );
        }

        return (
          <div key={parameter.id} className="grid min-w-0 gap-2">
            <Label htmlFor={`report-parameter-${parameter.id}`}>
              {parameter.label}
            </Label>
            <Input
              id={`report-parameter-${parameter.id}`}
              value={value}
              onChange={event => onChange(parameter.id, event.target.value)}
            />
            {parameter.description ? (
              <p className="text-sm leading-5 text-muted-foreground">
                {parameter.description}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ReportResults({
  resultQuery,
  runQuery,
  dataSource,
  permissionsStatus,
  canExport,
}: {
  resultQuery: ReturnType<typeof useQuery<ReportResult>>;
  runQuery: ReportQuery;
  dataSource: ReportsDataSource;
  permissionsStatus: 'ready' | 'unavailable';
  canExport: boolean;
}) {
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const requestExport = async () => {
    setExportMessage(null);
    if (permissionsStatus !== 'ready' || !canExport) {
      setExportState('unavailable');
      setExportMessage('Export requires the reports.export permission.');
      return;
    }
    if (!dataSource.requestExport) {
      setExportState('unavailable');
      setExportMessage(
        'No export endpoint is configured for this application.',
      );
      return;
    }

    setExportState('pending');
    try {
      const exportResult = await dataSource.requestExport(runQuery);
      setExportState('ready');
      setExportMessage(
        exportResult.downloadUrl
          ? `Export ready: ${exportResult.fileName}.`
          : `Export requested: ${exportResult.fileName}.`,
      );
    } catch (error) {
      setExportState('error');
      setExportMessage(errorMessage(error) ?? 'The export request failed.');
    }
  };

  if (resultQuery.isPending) {
    return <DataTableSkeleton columns={4} rows={6} label="Running report" />;
  }

  if (resultQuery.isError) {
    return (
      <ErrorState
        title="Report could not be generated"
        message={errorMessage(resultQuery.error)}
        retryLabel="Retry report"
        onRetry={() => void resultQuery.refetch()}
      />
    );
  }

  const result = resultQuery.data;
  if (!result) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">Result set</p>
          <p className="break-words text-sm text-muted-foreground">
            {result.totalCount} total records
            {result.generatedAtLabel
              ? ` · Generated ${result.generatedAtLabel}`
              : ''}
            {result.hasMore ? ' · Showing a bounded result window' : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={
              !canExport ||
              permissionsStatus !== 'ready' ||
              !dataSource.requestExport ||
              exportState === 'pending'
            }
            aria-busy={exportState === 'pending'}
            onClick={() => void requestExport()}
          >
            <Download className="size-4" aria-hidden="true" />
            {exportState === 'pending' ? 'Requesting export…' : 'Export result'}
          </Button>
        </div>
      </div>
      {permissionsStatus !== 'ready' ||
      !canExport ||
      !dataSource.requestExport ? (
        <p className="text-sm text-muted-foreground" role="status">
          Export is unavailable until a permitted export endpoint is configured.
        </p>
      ) : null}
      {exportMessage ? (
        <p
          className={
            exportState === 'error'
              ? 'text-sm text-destructive'
              : 'text-sm text-success'
          }
          role={exportState === 'error' ? 'alert' : 'status'}
        >
          {exportMessage}
        </p>
      ) : null}
      {result.rows.length === 0 ? (
        <EmptyState
          title="No results for these parameters"
          description="Try a wider scope or a different parameter before running the report again."
        />
      ) : (
        <DataTable
          caption="Report results"
          items={result.rows}
          columns={reportResultColumns(result)}
          getRowId={row => row.id}
          className="max-h-[32rem] overflow-auto"
        />
      )}
    </div>
  );
}

export function ReportsScreen({
  dataSource = sampleReportsDataSource,
  initialQuery,
}: ReportsScreenProps = {}) {
  const permissions = usePermissions();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    initialQuery?.reportId ?? null,
  );
  const [parameterValuesByReport, setParameterValuesByReport] = useState<
    Record<string, Record<string, string>>
  >(() =>
    initialQuery
      ? { [initialQuery.reportId]: { ...initialQuery.parameters } }
      : {},
  );
  const [runQuery, setRunQuery] = useState<ReportQuery | null>(
    initialQuery ?? null,
  );
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const catalogQuery = useQuery({
    queryKey: ['feature-pack', 'reports', 'catalog'],
    queryFn: ({ signal }) => dataSource.listReports(signal),
    retry: false,
  });

  const reports = useMemo(() => catalogQuery.data ?? [], [catalogQuery.data]);
  const selectedReport =
    reports.find(report => report.id === selectedReportId) ?? reports[0];
  const parameterValues = useMemo(() => {
    if (!selectedReport) {
      return {};
    }

    const savedValues = parameterValuesByReport[selectedReport.id] ?? {};
    return Object.fromEntries(
      selectedReport.parameters.map(parameter => [
        parameter.id,
        savedValues[parameter.id] ??
          parameter.defaultValue ??
          parameter.options?.[0]?.value ??
          '',
      ]),
    );
  }, [parameterValuesByReport, selectedReport]);
  const categories = useMemo(
    () => [...new Set(reports.map(report => report.category))].sort(),
    [reports],
  );
  const filteredReports = reports.filter(report => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      `${report.name} ${report.description} ${report.category}`
        .toLowerCase()
        .includes(normalizedSearch);
    return (
      matchesSearch && (category === 'all' || report.category === category)
    );
  });

  const selectReport = (report: ReportDefinition) => {
    setSelectedReportId(report.id);
    setRunQuery(null);
  };

  const runSelectedReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedReport) {
      return;
    }
    setRunQuery({
      reportId: selectedReport.id,
      parameters: { ...parameterValues },
    });
  };

  const resultQuery = useQuery({
    queryKey: ['feature-pack', 'reports', 'result', runQuery],
    queryFn: ({ signal }) => {
      if (!runQuery) {
        throw new Error('Select a report before running it.');
      }
      return dataSource.runReport(runQuery, signal);
    },
    enabled: runQuery !== null,
    retry: false,
  });
  const isRunning = runQuery !== null && resultQuery.isPending;

  return (
    <ApplicationPage>
      <PageHeader
        title="Reports"
        description="A neutral reporting workflow: choose a report, provide parameters, inspect a bounded result set, and hand export to a product-owned API. Illustrative data is replaceable through the ReportsDataSource contract."
        status={<Badge variant="outline">Illustrative source</Badge>}
      />

      {catalogQuery.isPending ? (
        <LoadingState label="Loading report catalog" />
      ) : catalogQuery.isError ? (
        <ErrorState
          title="Report catalog unavailable"
          message={errorMessage(catalogQuery.error)}
          retryLabel="Retry catalog"
          onRetry={() => void catalogQuery.refetch()}
        />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports are available"
          description="A product can provide report definitions through the ReportsDataSource when its reporting API is ready."
        />
      ) : (
        <>
          <PageSection
            title="Report catalog"
            description="The catalog stays product-neutral; domain teams can add report definitions without rebuilding this page structure."
          >
            <SearchFilterToolbar
              aria-label="Search report catalog"
              search={
                <div className="grid gap-2">
                  <Label htmlFor="reports-search">Search reports</Label>
                  <Input
                    id="reports-search"
                    value={search}
                    placeholder="Name, description, or category"
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>
              }
              filters={
                <div className="grid min-w-40 gap-2">
                  <Label htmlFor="reports-category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="reports-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map(value => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              }
              resultSummary={`${filteredReports.length} of ${reports.length} reports`}
              onClear={() => {
                setSearch('');
                setCategory('all');
              }}
              clearDisabled={search.length === 0 && category === 'all'}
            />
            {filteredReports.length === 0 ? (
              <EmptyState
                title="No matching reports"
                description="Clear the filters or try a different report name."
              />
            ) : (
              <ReportCatalog
                reports={filteredReports}
                selectedId={selectedReportId}
                onSelect={selectReport}
              />
            )}
          </PageSection>

          {selectedReport ? (
            <PageSection
              title="Report parameters"
              description={`Configure ${selectedReport.name} before requesting its results.`}
            >
              <FormPage
                onSubmit={runSelectedReport}
                actions={
                  <Button
                    type="submit"
                    aria-busy={isRunning}
                    disabled={isRunning}
                  >
                    <Play className="size-4" aria-hidden="true" />
                    {isRunning ? 'Running report…' : 'Run report'}
                  </Button>
                }
              >
                <FormSection
                  title={selectedReport.name}
                  description="Parameters belong to the report definition and can be mapped to a product API without changing the shared form rhythm."
                >
                  <ReportParameterControl
                    report={selectedReport}
                    values={parameterValues}
                    onChange={(id, value) =>
                      setParameterValuesByReport(current => ({
                        ...current,
                        [selectedReport.id]: {
                          ...(current[selectedReport.id] ?? {}),
                          [id]: value,
                        },
                      }))
                    }
                  />
                </FormSection>
              </FormPage>
            </PageSection>
          ) : null}

          {runQuery ? (
            <PageSection
              title="Results"
              description="Results remain in a horizontally scrollable, keyboard-focusable region when columns exceed a narrow viewport."
            >
              <ReportResults
                key={JSON.stringify(runQuery)}
                resultQuery={resultQuery}
                runQuery={runQuery}
                dataSource={dataSource}
                permissionsStatus={permissions.status}
                canExport={permissions.can(REPORT_PERMISSION_IDS.export)}
              />
            </PageSection>
          ) : null}
        </>
      )}
    </ApplicationPage>
  );
}

export const reportsFeaturePack = {
  id: 'reports',
  route: '/reports',
  navigation: {
    label: 'Reports',
    description: 'Catalog, run, and inspect reports.',
    icon: FileText,
  },
  screen: ReportsScreen,
  dependencies: {
    platform: ['@platform/ui', '@platform/sdk'],
  },
} satisfies FeaturePack;
