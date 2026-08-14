/**
 * Replaceable frontend inspection contract for higher-trust operational
 * records. It describes what an API may return; it does not claim immutability,
 * compliance, tamper resistance, or any other backend guarantee.
 */
export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditActor {
  readonly id: string;
  readonly label: string;
}

export interface AuditResource {
  readonly type: string;
  readonly label: string;
  readonly reference: string;
}

export interface AuditMetadata {
  readonly label: string;
  readonly value: string;
}

export interface AuditRecord {
  readonly id: string;
  /** ISO-8601 timestamp supplied by the audit service. */
  readonly occurredAt: string;
  readonly occurredAtLabel?: string;
  readonly actor: AuditActor;
  readonly action: string;
  readonly resource: AuditResource;
  readonly outcome: AuditOutcome;
  readonly metadata?: readonly AuditMetadata[];
}

export interface AuditLogQuery {
  readonly search: string;
  readonly outcome: AuditOutcome | 'all';
  readonly cursor: string | null;
  readonly pageSize: number;
}

export interface AuditLogPage {
  readonly items: readonly AuditRecord[];
  readonly totalCount: number;
  readonly nextCursor?: string | null;
}

export interface AuditLogDataSource {
  list: (query: AuditLogQuery, signal?: AbortSignal) => Promise<AuditLogPage>;
}
