import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  PlatformProvider,
  type AuthAdapter,
  type PermissionsAdapter,
} from '@platform/sdk';

import { appInfo } from '../../lib/app-info';
import type { AuditLogDataSource } from './contract';
import { AuditLogScreen } from './index';

function renderAudit(
  auth?: AuthAdapter,
  permissions?: PermissionsAdapter,
  dataSource?: AuditLogDataSource,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <PlatformProvider
      config={{ app: appInfo, adapters: { auth, permissions } }}
    >
      <QueryClientProvider client={queryClient}>
        <AuditLogScreen dataSource={dataSource} />
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

const authSnapshot = {
  isAuthenticated: true,
  user: { id: 'user:default/ada', displayName: 'Ada Lovelace' },
};
const auth: AuthAdapter = {
  getSnapshot: () => authSnapshot,
  subscribe: () => () => {},
  signIn: async () => {},
  signOut: async () => {},
};

const permissionSnapshot = {
  can: (permission: string) => permission === 'audit-log.view',
};
const permissions: PermissionsAdapter = {
  getSnapshot: () => permissionSnapshot,
  subscribe: () => () => {},
};
const deniedPermissionSnapshot = { can: () => false };
const deniedPermissions: PermissionsAdapter = {
  getSnapshot: () => deniedPermissionSnapshot,
  subscribe: () => () => {},
};

const source: AuditLogDataSource = {
  list: async () => ({
    items: [
      {
        id: 'audit-test-1',
        occurredAt: '2026-08-14T08:44:00.000Z',
        action: 'Updated preferences',
        actor: { id: 'user:default/ada', label: 'Ada Lovelace' },
        resource: {
          type: 'Preference set',
          label: 'Application preferences',
          reference: 'preferences-1',
        },
        outcome: 'success',
        metadata: [{ label: 'Request ID', value: 'req-1' }],
      },
    ],
    totalCount: 1,
    nextCursor: null,
  }),
};

describe('audit log feature pack', () => {
  it('requires both an authenticated identity and view permission', () => {
    renderAudit(auth, deniedPermissions);

    expect(screen.getByText('Access is not available')).toBeInTheDocument();
    expect(
      screen.getByText(/Backend authorization remains authoritative/),
    ).toBeInTheDocument();
  });

  it('renders records and opens inspection details when permitted', async () => {
    const user = userEvent.setup();
    renderAudit(auth, permissions, source);

    expect(await screen.findByText('Updated preferences')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Inspect audit record audit-test-1' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Audit record details' }),
    ).toBeInTheDocument();
    expect(screen.getByText('preferences-1')).toBeInTheDocument();
  });

  it('renders the auth dependency boundary when no provider is configured', () => {
    renderAudit(undefined, permissions, source);

    expect(screen.getByText('Authentication unavailable')).toBeInTheDocument();
  });
});
