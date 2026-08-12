import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';
import { Button } from '../ui/button.js';
import { Skeleton } from '../ui/skeleton.js';

export interface SearchFilterToolbarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  resultSummary?: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  clearDisabled?: boolean;
}

/**
 * Slot-based search/filter/action row. Consumers own the actual fields and
 * labels; the platform owns grouping, wrapping, and the result-summary row.
 */
export function SearchFilterToolbar({
  search,
  filters,
  actions,
  resultSummary,
  onClear,
  clearLabel = 'Clear filters',
  clearDisabled = false,
  className,
  'aria-label': ariaLabel = 'Search and filter',
  ...props
}: SearchFilterToolbarProps) {
  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      {...props}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {search ? <div className="min-w-0 flex-1">{search}</div> : null}
        {filters ? (
          <div className="flex flex-wrap items-end gap-3">{filters}</div>
        ) : null}
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {resultSummary || onClear ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <div className="min-w-0 text-muted-foreground">{resultSummary}</div>
          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={clearDisabled}
            >
              {clearLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> extends HTMLAttributes<HTMLDivElement> {
  items: readonly T[];
  columns: readonly DataTableColumn<T>[];
  getRowId: (item: T, index: number) => string;
  caption: string;
  empty?: ReactNode;
}

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

/** Accessible, overflow-safe tabular data surface with product-owned cells. */
export function DataTable<T>({
  items,
  columns,
  getRowId,
  caption,
  empty,
  className,
  ...props
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      // The region is intentionally focusable so keyboard users can move a
      // horizontally overflowing table with the same scroll container.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      role="region"
      aria-label={caption}
      {...props}
    >
      {items.length === 0 && empty ? (
        <div className="p-8">{empty}</div>
      ) : (
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted/50 text-muted-foreground">
            <tr>
              {columns.map(column => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-5 py-3 font-medium',
                    alignClasses[column.align ?? 'left'],
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr
                  key={getRowId(item, index)}
                  className="border-b border-border last:border-0"
                >
                  {columns.map(column => (
                    <td
                      key={column.id}
                      className={cn(
                        'max-w-[24rem] break-words px-5 py-4 align-top',
                        alignClasses[column.align ?? 'left'],
                        column.className,
                      )}
                    >
                      {column.cell(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
  label?: string;
  className?: string;
}

/** Table-shaped loading state that preserves the data page's layout. */
export function DataTableSkeleton({
  columns = 4,
  rows = 5,
  label = 'Loading data',
  className,
}: DataTableSkeletonProps) {
  return (
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      className={cn(
        'overflow-x-auto rounded-lg border border-border bg-card',
        className,
      )}
      // The skeleton preserves the same horizontally scrollable table shape
      // as DataTable, so keyboard users need the same focusable region.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table aria-hidden="true" className="w-full min-w-[38rem]">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {Array.from({ length: columns }, (_, index) => (
              <th key={index} className="px-5 py-4">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_rowSlot, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {Array.from({ length: columns }, (_columnSlot, columnIndex) => (
                <td key={columnIndex} className="px-5 py-5">
                  <Skeleton
                    className={cn('h-4', columnIndex === 0 ? 'w-40' : 'w-24')}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="sr-only">{label}</span>
    </div>
  );
}
