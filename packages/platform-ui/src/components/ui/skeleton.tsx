import { cn } from '../../lib/cn.js';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className,
      )}
      aria-hidden="true"
    />
  );
}
