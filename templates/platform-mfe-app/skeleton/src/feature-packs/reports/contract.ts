/**
 * Replaceable frontend contract for reporting data. The screen only knows how
 * to ask for a catalog, run a selected report, and request an export; REST,
 * GraphQL, or a platform service can implement this boundary later.
 */
export type ReportParameterKind = 'text' | 'select';

export interface ReportParameterOption {
  readonly value: string;
  readonly label: string;
}

export interface ReportParameter {
  readonly id: string;
  readonly label: string;
  readonly kind: ReportParameterKind;
  readonly description?: string;
  readonly defaultValue?: string;
  readonly options?: readonly ReportParameterOption[];
}

export interface ReportDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly parameters: readonly ReportParameter[];
}

export interface ReportQuery {
  readonly reportId: string;
  readonly parameters: Readonly<Record<string, string>>;
}

export type ReportCell = string | number | boolean | null;

export interface ReportColumn {
  readonly id: string;
  readonly label: string;
  readonly align?: 'left' | 'center' | 'right';
}

export interface ReportResultRow {
  readonly id: string;
  readonly values: Readonly<Record<string, ReportCell>>;
}

export interface ReportResult {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly generatedAtLabel?: string;
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly ReportResultRow[];
  readonly totalCount: number;
  /** True when the backend intentionally returned a bounded result window. */
  readonly hasMore?: boolean;
}

export interface ReportExportResult {
  readonly fileName: string;
  /** A backend-provided same-origin or signed URL, when one is available. */
  readonly downloadUrl?: string;
}

export interface ReportsDataSource {
  listReports: (signal?: AbortSignal) => Promise<readonly ReportDefinition[]>;
  runReport: (
    query: ReportQuery,
    signal?: AbortSignal,
  ) => Promise<ReportResult>;
  /** Optional until the product supplies an export endpoint. */
  requestExport?: (
    query: ReportQuery,
    signal?: AbortSignal,
  ) => Promise<ReportExportResult>;
}
