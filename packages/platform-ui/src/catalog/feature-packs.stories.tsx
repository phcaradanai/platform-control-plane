import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  PlatformProvider,
  type AuthAdapter,
  type PermissionsAdapter,
} from '@platform/sdk';
import { ApplicationShell, Button, ThemeToggle } from '@platform/ui';
import {
  AuthenticationScreen,
  authenticationFeaturePack,
} from '@platform/feature-packs/authentication';
import {
  ProfileScreen,
  profileFeaturePack,
} from '@platform/feature-packs/profile';
import {
  PermissionScreen,
  rbacFeaturePack,
} from '@platform/feature-packs/rbac';
import {
  DashboardScreen,
  dashboardFeaturePack,
} from '@platform/feature-packs/dashboard';
import {
  SettingsScreen,
  settingsFeaturePack,
} from '@platform/feature-packs/settings';
import {
  ReportsScreen,
  reportsFeaturePack,
} from '@platform/feature-packs/reports';
import type {
  ReportDefinition,
  ReportQuery,
  ReportsDataSource,
} from '@platform/feature-packs/reports';
import {
  HistoryScreen,
  historyFeaturePack,
} from '@platform/feature-packs/history';
import type {
  HistoryDataSource,
  HistoryQuery,
} from '@platform/feature-packs/history';
import {
  AuditLogScreen,
  auditLogFeaturePack,
} from '@platform/feature-packs/audit-log';
import type {
  AuditLogDataSource,
  AuditLogQuery,
} from '@platform/feature-packs/audit-log';

const portalApp = {
  id: 'design-system-portal',
  title: 'Design System Portal',
  owner: 'group:default/platform-team',
  mode: 'standalone' as const,
  capabilities: [],
};

function createAuthAdapter(
  snapshot: NonNullable<ReturnType<AuthAdapter['getSnapshot']>>,
): AuthAdapter {
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    signIn: async () => {},
    signOut: async () => {},
  };
}

function createPermissionsAdapter(
  allowed: readonly string[],
): PermissionsAdapter {
  const snapshot = {
    can: (permission: string) => allowed.includes(permission),
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
  };
}

function IdentityProvider({
  children,
  auth,
  permissions,
}: {
  children: ReactNode;
  auth?: AuthAdapter;
  permissions?: PermissionsAdapter;
}) {
  return (
    <PlatformProvider
      config={{
        app: portalApp,
        adapters: { auth, permissions },
      }}
    >
      {children}
    </PlatformProvider>
  );
}

const meta = {
  title: 'Feature packs',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The portal renders the feature-pack implementations copied into generated applications. A pack owns its route identity, navigation contribution, screen, neutral sample interactions, tests, and replaceable boundary notes; the application owns route registration and domain data.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DashboardPack: Story = {
  render: () => <DashboardScreen />,
  parameters: {
    docs: {
      description: {
        story: `Route ${dashboardFeaturePack.route} · navigation: ${dashboardFeaturePack.navigation.label}. Includes a responsive summary, data table, range selector, and pending refresh behavior over explicitly illustrative data.`,
      },
    },
  },
};

export const SettingsPack: Story = {
  render: () => <SettingsScreen />,
  parameters: {
    docs: {
      description: {
        story: `Route ${settingsFeaturePack.route} · navigation: ${settingsFeaturePack.navigation.label}. Includes responsive settings navigation, accessible form sections, switches, local-save pending state, and a replaceable API boundary.`,
      },
    },
  },
};

export const AuthenticationSignedOut: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: false,
        user: null,
      })}
    >
      <AuthenticationScreen />
    </IdentityProvider>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Real Authentication pack signed-out state. Sign-in uses the platform AuthAdapter and preserves a same-origin return path.',
      },
    },
  },
};

export const AuthenticationPending: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: false,
        user: null,
        phase: 'pending',
      })}
    >
      <AuthenticationScreen />
    </IdentityProvider>
  ),
};

export const AuthenticationAuthenticated: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: {
          id: 'user:default/ada',
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      })}
    >
      <AuthenticationScreen />
    </IdentityProvider>
  ),
};

export const AuthenticationUnavailable: Story = {
  render: () => (
    <IdentityProvider>
      <AuthenticationScreen />
    </IdentityProvider>
  ),
};

export const AuthenticationError: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: false,
        user: null,
        phase: 'error',
        error:
          'The identity provider timed out. Try again when it is available.',
      })}
    >
      <AuthenticationScreen />
    </IdentityProvider>
  ),
};

export const ProfileNormal: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: {
          id: 'user:default/ada',
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      })}
    >
      <ProfileScreen />
    </IdentityProvider>
  ),
};

export const ProfileLoading: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: false,
        user: null,
        phase: 'pending',
      })}
    >
      <ProfileScreen />
    </IdentityProvider>
  ),
};

export const ProfileUnavailable: Story = {
  render: () => (
    <IdentityProvider>
      <ProfileScreen />
    </IdentityProvider>
  ),
};

export const PermissionsPermitted: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: { id: 'user:default/ada', displayName: 'Ada Lovelace' },
      })}
      permissions={createPermissionsAdapter([
        'permissions.view',
        'permissions.manage',
        'application.edit',
      ])}
    >
      <PermissionScreen />
    </IdentityProvider>
  ),
};

export const PermissionsPartiallyPermitted: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: { id: 'user:default/grace', displayName: 'Grace Hopper' },
      })}
      permissions={createPermissionsAdapter(['permissions.view'])}
    >
      <PermissionScreen />
    </IdentityProvider>
  ),
};

export const PermissionsDenied: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: {
          id: 'user:default/katherine',
          displayName: 'Katherine Johnson',
        },
      })}
      permissions={createPermissionsAdapter([])}
    >
      <PermissionScreen />
    </IdentityProvider>
  ),
};

export const PermissionsUnavailable: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: { id: 'user:default/guest', displayName: 'Current user' },
      })}
    >
      <PermissionScreen />
    </IdentityProvider>
  ),
};

function CombinedFeaturePacks() {
  const [currentPath, setCurrentPath] = useState('/dashboard');
  const selectedPack =
    currentPath === dashboardFeaturePack.route
      ? dashboardFeaturePack
      : settingsFeaturePack;
  const Screen = selectedPack.screen;

  return (
    <ApplicationShell
      brand={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Generated app</p>
          <p className="truncate text-xs text-muted-foreground">
            Feature pack composition
          </p>
        </div>
      }
      mobileTitle="Generated app"
      navigation={[dashboardFeaturePack, settingsFeaturePack].map(pack => ({
        href: pack.route,
        label: pack.navigation.label,
        current: currentPath === pack.route,
        icon: pack.navigation.icon ? (
          <pack.navigation.icon className="size-4" aria-hidden="true" />
        ) : undefined,
      }))}
      headerActions={
        <>
          <ThemeToggle />
          <Button type="button" variant="outline" size="sm">
            Shared action
          </Button>
        </>
      }
      mainClassName="bg-muted/10"
    >
      <div data-feature-pack-path={currentPath}>
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Feature pack preview"
        >
          <Button
            type="button"
            variant={currentPath === '/dashboard' ? 'default' : 'outline'}
            onClick={() => setCurrentPath('/dashboard')}
          >
            Preview dashboard
          </Button>
          <Button
            type="button"
            variant={currentPath === '/settings' ? 'default' : 'outline'}
            onClick={() => setCurrentPath('/settings')}
          >
            Preview settings
          </Button>
        </div>
        <Screen />
      </div>
    </ApplicationShell>
  );
}

export const DashboardAndSettingsComposition: Story = {
  render: () => <CombinedFeaturePacks />,
  parameters: {
    docs: {
      description: {
        story:
          'Both packs contribute independent navigation entries and screens to one shared application shell. The story uses the same pack registry objects and screens that the template composes; it does not recreate feature UI for the portal.',
      },
    },
  },
};

function IdentityAndAccessCompositionPreview() {
  const [currentPath, setCurrentPath] = useState('/authentication');
  const packs = [
    authenticationFeaturePack,
    profileFeaturePack,
    rbacFeaturePack,
  ];
  const selectedPack =
    packs.find(pack => pack.route === currentPath) ?? packs[0]!;
  const Screen = selectedPack.screen;

  return (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: {
          id: 'user:default/ada',
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      })}
      permissions={createPermissionsAdapter([
        'permissions.view',
        'permissions.manage',
        'application.edit',
      ])}
    >
      <ApplicationShell
        brand={
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Generated app</p>
            <p className="truncate text-xs text-muted-foreground">
              Identity and access composition
            </p>
          </div>
        }
        mobileTitle="Generated app"
        navigation={packs.map(pack => ({
          href: pack.route,
          label: pack.navigation.label,
          current: currentPath === pack.route,
          icon: pack.navigation.icon ? (
            <pack.navigation.icon className="size-4" aria-hidden="true" />
          ) : undefined,
        }))}
        headerActions={<ThemeToggle />}
        mainClassName="bg-muted/10"
      >
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Identity pack preview"
        >
          {packs.map(pack => (
            <Button
              key={pack.id}
              type="button"
              variant={currentPath === pack.route ? 'default' : 'outline'}
              onClick={() => setCurrentPath(pack.route)}
            >
              Preview {pack.navigation.label}
            </Button>
          ))}
        </div>
        <Screen />
      </ApplicationShell>
    </IdentityProvider>
  );
}

export const IdentityAndAccessComposition: Story = {
  render: () => <IdentityAndAccessCompositionPreview />,
  parameters: {
    docs: {
      description: {
        story:
          'The real Authentication, Profile, and Permission/RBAC packs contribute independent routes and navigation entries to one shared ApplicationShell. Profile and RBAC declare Authentication as a dependency in their pack contracts.',
      },
    },
  },
};

const portalReportDefinitions: readonly ReportDefinition[] = [
  {
    id: 'portal-report',
    name: 'Operational result set',
    description: 'A neutral report definition used by the portal fixture.',
    category: 'Overview',
    parameters: [
      {
        id: 'scope',
        label: 'Scope',
        kind: 'text',
        defaultValue: 'All records',
      },
    ],
  },
];

const portalReportQuery: ReportQuery = {
  reportId: 'portal-report',
  parameters: { scope: 'All records' },
};

const portalReportsSource: ReportsDataSource = {
  listReports: async () => portalReportDefinitions,
  runReport: async query => ({
    reportId: query.reportId,
    generatedAt: '2026-08-14T08:30:00.000Z',
    generatedAtLabel: '14 Aug 2026, 08:30 UTC',
    columns: [
      { id: 'record', label: 'Record' },
      { id: 'state', label: 'State' },
      { id: 'source', label: 'Source' },
    ],
    rows: [
      {
        id: 'portal-result-1',
        values: {
          record: 'Record 01',
          state: 'Ready',
          source: 'Application',
        },
      },
      {
        id: 'portal-result-2',
        values: {
          record: 'Record 02',
          state: 'Needs review',
          source: 'Platform service',
        },
      },
    ],
    totalCount: 2,
  }),
};

const portalReportsLoadingSource: ReportsDataSource = {
  listReports: () => new Promise<readonly ReportDefinition[]>(() => {}),
  runReport: portalReportsSource.runReport,
};

const portalReportsEmptySource: ReportsDataSource = {
  listReports: async () => [],
  runReport: portalReportsSource.runReport,
};

const portalReportsErrorSource: ReportsDataSource = {
  listReports: async () => {
    throw new Error('The reporting service is unavailable.');
  },
  runReport: portalReportsSource.runReport,
};

export const ReportsCatalog: Story = {
  render: () => (
    <IdentityProvider>
      <ReportsScreen />
    </IdentityProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `Route ${reportsFeaturePack.route} · catalog, filter toolbar, parameter form, and permission-aware export boundary using the real Reports pack.`,
      },
    },
  },
};

export const ReportsLoading: Story = {
  render: () => (
    <IdentityProvider>
      <ReportsScreen dataSource={portalReportsLoadingSource} />
    </IdentityProvider>
  ),
};

export const ReportsEmpty: Story = {
  render: () => (
    <IdentityProvider>
      <ReportsScreen dataSource={portalReportsEmptySource} />
    </IdentityProvider>
  ),
};

export const ReportsError: Story = {
  render: () => (
    <IdentityProvider>
      <ReportsScreen dataSource={portalReportsErrorSource} />
    </IdentityProvider>
  ),
};

export const ReportsResults: Story = {
  render: () => (
    <IdentityProvider
      permissions={createPermissionsAdapter(['reports.export'])}
    >
      <ReportsScreen
        dataSource={portalReportsSource}
        initialQuery={portalReportQuery}
      />
    </IdentityProvider>
  ),
};

const portalHistorySource: HistoryDataSource = {
  list: async (query: HistoryQuery) => ({
    items: [
      {
        id: 'portal-history-1',
        timestamp: '2026-08-14T08:42:00.000Z',
        timestampLabel: 'Today, 08:42 UTC',
        summary: query.search
          ? `Matching activity: ${query.search}`
          : 'Application preferences updated',
        actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
        source: 'Application',
        category: 'Configuration',
        status: 'success',
        details: [{ label: 'Reference', value: 'preferences-2026-08-14' }],
      },
    ],
    totalCount: 1,
    nextCursor: null,
  }),
};

const portalHistoryLoadingSource: HistoryDataSource = {
  list: () => new Promise<never>(() => {}),
};

const portalHistoryEmptySource: HistoryDataSource = {
  list: async () => ({ items: [], totalCount: 0, nextCursor: null }),
};

const portalHistoryErrorSource: HistoryDataSource = {
  list: async () => {
    throw new Error('The history service is unavailable.');
  },
};

export const HistoryPopulated: Story = {
  render: () => <HistoryScreen dataSource={portalHistorySource} />,
  parameters: {
    docs: {
      description: {
        story: `Route ${historyFeaturePack.route} · searchable chronological records, details dialog, status badges, and cursor pagination use the real History pack.`,
      },
    },
  },
};

export const HistoryLoading: Story = {
  render: () => <HistoryScreen dataSource={portalHistoryLoadingSource} />,
};

export const HistoryEmpty: Story = {
  render: () => <HistoryScreen dataSource={portalHistoryEmptySource} />,
};

export const HistoryError: Story = {
  render: () => <HistoryScreen dataSource={portalHistoryErrorSource} />,
};

const portalAuditSource: AuditLogDataSource = {
  list: async (query: AuditLogQuery) => ({
    items: [
      {
        id: 'portal-audit-1',
        occurredAt: '2026-08-14T08:44:00.000Z',
        occurredAtLabel: 'Today, 08:44 UTC',
        actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
        action: query.search
          ? `Reviewed ${query.search}`
          : 'Updated preferences',
        resource: {
          type: 'Preference set',
          label: 'Application preferences',
          reference: 'preferences-2026-08-14',
        },
        outcome: 'success',
        metadata: [{ label: 'Request ID', value: 'req-7f42' }],
      },
    ],
    totalCount: 1,
    nextCursor: null,
  }),
};

function PortalAuditProvider({ children }: { children: ReactNode }) {
  return (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: {
          id: 'user:default/ada',
          displayName: 'Ada Lovelace',
          email: 'ada@example.com',
        },
      })}
      permissions={createPermissionsAdapter(['audit-log.view'])}
    >
      {children}
    </IdentityProvider>
  );
}

export const AuditLogPopulated: Story = {
  render: () => (
    <PortalAuditProvider>
      <AuditLogScreen dataSource={portalAuditSource} />
    </PortalAuditProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: `Route ${auditLogFeaturePack.route} · actor/action/resource/outcome inspection, filtering, detail view, and explicit backend-authority copy use the real Audit Log pack.`,
      },
    },
  },
};

export const AuditLogFiltered: Story = {
  render: () => (
    <PortalAuditProvider>
      <AuditLogScreen dataSource={portalAuditSource} />
    </PortalAuditProvider>
  ),
};

export const AuditLogDenied: Story = {
  render: () => (
    <IdentityProvider
      auth={createAuthAdapter({
        isAuthenticated: true,
        user: { id: 'user:default/guest', displayName: 'Current user' },
      })}
      permissions={createPermissionsAdapter([])}
    >
      <AuditLogScreen dataSource={portalAuditSource} />
    </IdentityProvider>
  ),
};

export const AuditLogUnavailable: Story = {
  render: () => (
    <IdentityProvider>
      <AuditLogScreen dataSource={portalAuditSource} />
    </IdentityProvider>
  ),
};

function OperationalDataCompositionPreview() {
  const packs = [
    authenticationFeaturePack,
    profileFeaturePack,
    rbacFeaturePack,
    dashboardFeaturePack,
    settingsFeaturePack,
    reportsFeaturePack,
    historyFeaturePack,
    auditLogFeaturePack,
  ];
  const [currentPath, setCurrentPath] = useState('/reports');
  const selectedPack =
    packs.find(pack => pack.route === currentPath) ?? packs[0]!;
  const Screen = selectedPack.screen;

  return (
    <PortalAuditProvider>
      <ApplicationShell
        brand={
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Generated app</p>
            <p className="truncate text-xs text-muted-foreground">
              Full feature composition
            </p>
          </div>
        }
        mobileTitle="Generated app"
        navigation={packs.map(pack => ({
          href: pack.route,
          label: pack.navigation.label,
          current: currentPath === pack.route,
          icon: pack.navigation.icon ? (
            <pack.navigation.icon className="size-4" aria-hidden="true" />
          ) : undefined,
        }))}
        headerActions={<ThemeToggle />}
        mainClassName="bg-muted/10"
      >
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="Operational feature pack preview"
        >
          {packs.map(pack => (
            <Button
              key={pack.id}
              type="button"
              size="sm"
              variant={currentPath === pack.route ? 'default' : 'outline'}
              onClick={() => setCurrentPath(pack.route)}
            >
              Preview {pack.navigation.label}
            </Button>
          ))}
        </div>
        <Screen />
      </ApplicationShell>
    </PortalAuditProvider>
  );
}

export const OperationalDataComposition: Story = {
  render: () => <OperationalDataCompositionPreview />,
  parameters: {
    docs: {
      description: {
        story:
          'Reports, History, and Audit Log compose with the accepted identity, access, Dashboard, and Settings packs through one real ApplicationShell. The portal renders their actual screens and pack metadata.',
      },
    },
  },
};
