/**
 * Replaceable frontend contract for application activity. A backend owns the
 * event source and pagination; this pack only defines how a page requests and
 * inspects a neutral chronological record.
 */
export type HistoryStatus = 'success' | 'pending' | 'failed' | 'info';

export interface HistoryActor {
  readonly id: string;
  readonly label: string;
}

export interface HistoryDetail {
  readonly label: string;
  readonly value: string;
}

export interface HistoryEvent {
  readonly id: string;
  /** ISO-8601 timestamp supplied by the event source. */
  readonly timestamp: string;
  readonly timestampLabel?: string;
  readonly summary: string;
  readonly description?: string;
  readonly actor?: HistoryActor;
  readonly source?: string;
  readonly category: string;
  readonly status: HistoryStatus;
  readonly details?: readonly HistoryDetail[];
}

export interface HistoryQuery {
  readonly search: string;
  readonly category: string;
  readonly status: HistoryStatus | 'all';
  readonly cursor: string | null;
  readonly pageSize: number;
}

export interface HistoryPage {
  readonly items: readonly HistoryEvent[];
  readonly totalCount: number;
  readonly nextCursor?: string | null;
}

export interface HistoryDataSource {
  list: (query: HistoryQuery, signal?: AbortSignal) => Promise<HistoryPage>;
}
