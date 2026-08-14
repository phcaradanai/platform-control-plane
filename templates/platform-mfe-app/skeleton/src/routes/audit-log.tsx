import { createFileRoute } from '@tanstack/react-router';

import { AuditLogScreen } from '../feature-packs/audit-log';

export const Route = createFileRoute('/audit-log')({
  component: AuditLogScreen,
});
