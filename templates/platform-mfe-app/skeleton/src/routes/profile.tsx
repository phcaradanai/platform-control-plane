import { createFileRoute } from '@tanstack/react-router';

import { ProfileScreen } from '../feature-packs/profile';

export const Route = createFileRoute('/profile')({
  component: ProfileScreen,
});
