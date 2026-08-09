import { Compass } from 'lucide-react';
import type { ReactNode } from 'react';

interface NotFoundStateProps {
  /**
   * Optional action rendered below the message (e.g. a router Link back
   * home). The component itself is router-agnostic so the platform package
   * never depends on a specific routing library.
   */
  action?: ReactNode;
}

export function NotFoundState({ action }: NotFoundStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-12 text-center">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
