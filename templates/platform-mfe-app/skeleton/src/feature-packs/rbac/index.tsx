import { KeyRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { useNavigation, usePermissions } from '@platform/sdk';
import type { PermissionId } from '@platform/sdk';
import {
  ApplicationPage,
  Badge,
  Button,
  Card,
  DeniedState,
  ErrorState,
  PageHeader,
  PageSection,
} from '@platform/ui';

import { AuthGate } from '../authentication';
import type { FeaturePack } from '../contract.js';

export const PERMISSION_IDS = {
  view: 'permissions.view' as PermissionId,
  manage: 'permissions.manage' as PermissionId,
} as const;

export interface PermissionDescriptor {
  readonly id: PermissionId;
  readonly label: string;
  readonly description: string;
}

const permissionCatalog: readonly PermissionDescriptor[] = [
  {
    id: PERMISSION_IDS.view,
    label: 'View access information',
    description: 'Read the permission information available to this app.',
  },
  {
    id: 'application.edit',
    label: 'Edit application configuration',
    description: 'Change application-owned configuration where permitted.',
  },
  {
    id: 'settings.manage',
    label: 'Manage settings',
    description: 'Save application preferences and account settings.',
  },
  {
    id: 'reports.export',
    label: 'Export reports',
    description: 'Request a report export when the product supports it.',
  },
];

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const permissions = usePermissions();

  if (permissions.status !== 'ready' || !permissions.can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function PermissionGuard({
  permission,
  children,
}: {
  permission: PermissionId;
  children: ReactNode;
}) {
  const permissions = usePermissions();

  if (permissions.status === 'unavailable') {
    return (
      <ErrorState
        title="Permission provider unavailable"
        message={permissions.reason}
        retryLabel="Return home"
      />
    );
  }

  if (!permissions.can(permission)) {
    return (
      <DeniedState
        title="Access is not available"
        description="The current permission contract does not grant this application access to the requested view. Backend authorization remains authoritative."
      />
    );
  }

  return <>{children}</>;
}

function PermissionList() {
  const permissions = usePermissions();

  if (permissions.status !== 'ready') {
    return null;
  }

  return (
    <div className="grid gap-3">
      {permissionCatalog.map(permission => {
        const allowed = permissions.can(permission.id);

        return (
          <div
            key={permission.id}
            className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <h3 className="break-words font-medium">{permission.label}</h3>
              <p className="break-words text-sm leading-5 text-muted-foreground">
                {permission.description}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                {permission.id}
              </p>
            </div>
            <Badge variant={allowed ? 'success' : 'outline'}>
              {allowed ? 'Permitted' : 'Not permitted'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}

export function PermissionScreen() {
  const navigation = useNavigation();
  const permissions = usePermissions();

  return (
    <ApplicationPage>
      <PageHeader
        title="Permissions"
        description="A provider-neutral access view using permission checks rather than role-name comparisons. This is frontend UX only; APIs must enforce authorization independently."
        status={
          <Badge
            variant={
              permissions.status === 'ready' ? 'outline' : 'secondary'
            }
          >
            {permissions.status === 'ready'
              ? 'Permission provider connected'
              : 'Permission provider unavailable'}
          </Badge>
        }
      />

      <AuthGate returnPath={navigation.currentPath}>
        <PermissionGuard permission={PERMISSION_IDS.view}>
          <PageSection
            title="Access available to this application"
            description="The list is a neutral contract preview. A product can replace the catalog with backend-provided permission descriptors without changing the guard or action pattern."
          >
            <PermissionList />
          </PageSection>

          <PageSection
            title="Permission management"
            description="Management controls are shown only when the permission contract grants them. No role model is assumed here."
          >
            <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="font-medium">Manage access assignments</h2>
                <p className="text-sm leading-5 text-muted-foreground">
                  Connect this action to a backend permission-management API
                  when the product owns that workflow.
                </p>
              </div>
              <PermissionGate
                permission={PERMISSION_IDS.manage}
                fallback={
                  <Button type="button" variant="outline" disabled>
                    Management not permitted
                  </Button>
                }
              >
                <Button type="button" disabled>
                  Management API unavailable
                </Button>
              </PermissionGate>
            </Card>
          </PageSection>
        </PermissionGuard>
      </AuthGate>
    </ApplicationPage>
  );
}

export const rbacFeaturePack = {
  id: 'rbac',
  route: '/rbac',
  navigation: {
    label: 'Permissions',
    description: 'Permission-aware access and management UX.',
    icon: KeyRound,
  },
  screen: PermissionScreen,
  dependencies: {
    platform: ['@platform/ui', '@platform/sdk'],
    featurePacks: ['authentication'],
  },
} satisfies FeaturePack;
