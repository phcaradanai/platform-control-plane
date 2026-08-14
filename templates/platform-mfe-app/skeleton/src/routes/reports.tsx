import { createFileRoute } from '@tanstack/react-router';

import { ReportsScreen } from '../feature-packs/reports';

export const Route = createFileRoute('/reports')({
  component: ReportsScreen,
});
