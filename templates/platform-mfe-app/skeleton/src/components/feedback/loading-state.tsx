import { Spinner } from '../ui/spinner';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-10 text-sm text-muted-foreground"
    >
      <Spinner className="size-6" />
      <span>{label}</span>
    </div>
  );
}
