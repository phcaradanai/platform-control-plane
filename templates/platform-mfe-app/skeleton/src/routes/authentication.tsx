import { createFileRoute } from '@tanstack/react-router';

import { AuthenticationScreen } from '../feature-packs/authentication';

export const Route = createFileRoute('/authentication')({
  component: AuthenticationScreen,
});
