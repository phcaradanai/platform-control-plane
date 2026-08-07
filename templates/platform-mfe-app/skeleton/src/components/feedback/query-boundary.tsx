import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';

export interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  loading?: ReactNode;
  empty?: {
    title: string;
    description?: string;
    action?: ReactNode;
  };
  errorTitle?: string;
  /** Renders the resolved data. Called only when data is defined and non-empty. */
  children: (data: T) => ReactNode;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object' && 'items' in (value as object)) {
    const items = (value as { items?: unknown[] }).items;
    return items === undefined || items.length === 0;
  }
  return false;
}

/**
 * Renders the canonical loading / empty / error / data states for a
 * TanStack Query result. Feature code uses this instead of hand-rolling
 * conditional rendering per screen.
 */
export function QueryBoundary<T>({
  query,
  loading,
  empty,
  errorTitle,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return loading ?? <LoadingState />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (isEmpty(query.data)) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing here yet'}
        description={empty?.description}
        action={empty?.action}
      />
    );
  }

  return children(query.data as T);
}
