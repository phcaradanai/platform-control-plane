import { createFileRoute } from '@tanstack/react-router';

import { HistoryScreen } from '../feature-packs/history';

export const Route = createFileRoute('/history')({
  component: HistoryScreen,
});
