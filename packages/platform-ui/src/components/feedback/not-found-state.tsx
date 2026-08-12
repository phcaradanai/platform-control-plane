import { Compass } from 'lucide-react';
import type { ReactNode } from 'react';

export interface NotFoundStateProps {
  title: string;
  description: string;
  /**
   * Optional action rendered below the message (e.g. a router Link back
   * home). The component itself is router-agnostic so the platform package
   * never depends on a specific routing library.
   */
  action?: ReactNode;
}

export function NotFoundState({
  title,
  description,
  action,
}: NotFoundStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-12 text-center">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
