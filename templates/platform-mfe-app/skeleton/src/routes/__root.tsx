import { Link, createRootRoute, Outlet } from '@tanstack/react-router';

import { AppShell } from '../components/layout/app-shell';
import { NotFoundState } from '@platform/ui';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function NotFoundComponent() {
  return (
    <NotFoundState
      action={
        <Link
          to="/"
          className="btn bg-primary text-primary-foreground hover:opacity-90"
        >
          Back to home
        </Link>
      }
    />
  );
}
