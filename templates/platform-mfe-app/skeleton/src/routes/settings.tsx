import { createFileRoute } from '@tanstack/react-router';

import { SettingsScreen } from '../feature-packs/settings';

export const Route = createFileRoute('/settings')({
  component: SettingsScreen,
});
