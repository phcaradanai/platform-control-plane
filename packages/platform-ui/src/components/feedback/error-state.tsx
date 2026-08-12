import { AlertTriangle } from 'lucide-react';

import { Button } from '../ui/button.js';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-card p-10 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {message ? (
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
