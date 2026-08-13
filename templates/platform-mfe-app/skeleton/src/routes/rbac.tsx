import { createFileRoute } from '@tanstack/react-router';

import { PermissionScreen } from '../feature-packs/rbac';

export const Route = createFileRoute('/rbac')({
  component: PermissionScreen,
});
