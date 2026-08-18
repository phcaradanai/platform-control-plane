import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/cn.js';

export interface DetailLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  aside?: ReactNode;
  asideLabel?: string;
}

/** Main/aside relationship for view pages; content can be any product-owned composition. */
export function DetailLayout({
  children,
  aside,
  asideLabel = 'Related information',
  className,
  ...props
}: DetailLayoutProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-8">{children}</div>
      {aside ? (
        <aside aria-label={asideLabel} className="min-w-0 space-y-4">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}

export interface DetailItem {
  id?: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DetailListProps extends HTMLAttributes<HTMLDListElement> {
  items: readonly DetailItem[];
  columns?: 1 | 2 | 3;
}

/** Definition-list presentation for labels and long, wrapping values. */
export function DetailList({
  items,
  columns = 1,
  className,
  ...props
}: DetailListProps) {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  } as const;

  return (
    <dl
      className={cn('grid gap-x-8 gap-y-6', columnClasses[columns], className)}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={item.id ?? `${index}-${String(item.label)}`}
          className="min-w-0"
        >
          <dt className="text-sm text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 min-w-0 break-words text-sm font-medium">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
