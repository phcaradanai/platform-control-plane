import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { QueryBoundary } from '../../components/feedback/query-boundary';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/cn';
import type { DemoRow } from './data';
import { useDemoRows } from './use-demo-rows';

const columns: ColumnDef<DemoRow>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: info => <span className="font-medium">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: info => {
      const value = info.getValue<DemoRow['status']>();
      return (
        <Badge
          variant={
            value === 'active' ? 'success' : value === 'pending' ? 'secondary' : 'outline'
          }
        >
          {value}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: info =>
      info.getValue<number>().toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: info => info.getValue<string>(),
  },
];

const STATUS_OPTIONS = ['active', 'pending', 'archived'] as const;

export function VirtualizedTable() {
  const query = useDemoRows();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') {
      return query.data;
    }
    return query.data?.filter(row => row.status === statusFilter) ?? [];
  }, [query.data, statusFilter]);

  const table = useReactTable({
    data: filteredRows ?? [],
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  return (
    <QueryBoundary
      query={query}
      empty={{
        title: 'No rows match the current filter',
        description: 'Clear the status filter to see all rows.',
        action: (
          <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
            Clear filter
          </Button>
        ),
      }}
    >
      {() => (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Filter by name…"
              value={(columnFilters.find(f => f.id === 'name')?.value as string) ?? ''}
              onChange={event =>
                setColumnFilters(current => [
                  ...current.filter(f => f.id !== 'name'),
                  ...(event.target.value
                    ? [{ id: 'name' as const, value: event.target.value }]
                    : []),
                ])
              }
              className="max-w-xs"
              aria-label="Filter by name"
            />
            <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
              {(['all', ...STATUS_OPTIONS] as const).map(option => (
                <Button
                  key={option}
                  size="sm"
                  variant={statusFilter === option ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(option)}
                  aria-pressed={statusFilter === option}
                >
                  {option}
                </Button>
              ))}
            </div>
            <span className="ml-auto text-sm text-muted-foreground" aria-live="polite">
              {rows.length} of 500 rows
            </span>
          </div>

          <Card className="overflow-hidden">
            <div ref={parentRef} className="max-h-[28rem] overflow-auto">
              <table className="w-full border-collapse text-sm" aria-label="Demo data">
                <caption className="sr-only">
                  Virtualized demo table with sortable columns
                </caption>
                <thead className="sticky top-0 z-10 bg-card">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          scope="col"
                          className="border-b border-border px-4 py-2 text-left font-medium text-muted-foreground"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              className={cn(
                                'inline-flex items-center gap-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                header.column.getIsSorted() && 'text-foreground',
                              )}
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={`Sort by ${String(header.column.columnDef.header)}`}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="size-3.5" aria-hidden="true" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="size-3.5" aria-hidden="true" />
                              ) : (
                                <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
                              )}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {virtualizer.getVirtualItems().map(virtualRow => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <tr
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        className="border-b border-border/60 last:border-b-0 hover:bg-muted/50"
                        style={{ transform: `translateY(${virtualRow.start}px)` }}
                      >
                        {row.getVisibleCells().map(cell => (
                          <td key={cell.id} className="px-4 py-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </QueryBoundary>
  );
}
