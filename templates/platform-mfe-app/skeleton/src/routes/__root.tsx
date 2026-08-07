import { createRootRoute, Outlet } from '@tanstack/react-router';

import { AppShell } from '../components/layout/app-shell';
import { NotFoundState } from '../components/feedback/not-found-state';

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
  return <NotFoundState />;
}
