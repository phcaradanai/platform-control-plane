import { Compass } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export function NotFoundState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-12 text-center">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        to="/"
        className="btn mt-2 bg-primary text-primary-foreground hover:opacity-90"
      >
        Back to home
      </Link>
    </div>
  );
}
