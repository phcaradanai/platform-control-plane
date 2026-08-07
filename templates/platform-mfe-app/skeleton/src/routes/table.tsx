import { createFileRoute } from '@tanstack/react-router';

import { VirtualizedTable } from '../features/table-demo/virtualized-table';

export const Route = createFileRoute('/table')({
  component: TableDemoPage,
});

function TableDemoPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Table demo</h1>
        <p className="text-muted-foreground">
          TanStack Table v8 + TanStack Virtual: sorting, column visibility,
          and a virtualized body over 500 generated rows.
        </p>
      </section>
      <VirtualizedTable />
    </div>
  );
}
