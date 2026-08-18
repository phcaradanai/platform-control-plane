import { createFileRoute } from '@tanstack/react-router';

import { DashboardScreen } from '../feature-packs/dashboard';

export const Route = createFileRoute('/dashboard')({
  component: DashboardScreen,
});
