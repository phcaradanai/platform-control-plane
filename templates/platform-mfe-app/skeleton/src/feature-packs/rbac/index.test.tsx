import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlatformProvider,
  type AuthAdapter,
  type PermissionsAdapter,
} from '@platform/sdk';
import { PermissionScreen } from './index';
import { appInfo } from '../../lib/app-info';

function renderPermissions(can: (permissionId: string) => boolean) {
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
  const permissionsSnapshot = { can };
  const permissions: PermissionsAdapter = {
    getSnapshot: () => permissionsSnapshot,
    subscribe: () => () => {},
  };

  return render(
    <PlatformProvider
      config={{ app: appInfo, adapters: { auth, permissions } }}
    >
      <PermissionScreen />
    </PlatformProvider>,
  );
}

describe('permission/RBAC feature pack', () => {
  it('renders partial permission results and disables unpermitted management', () => {
    renderPermissions(permissionId =>
      ['permissions.view', 'application.edit'].includes(permissionId),
    );

    expect(
      screen.getByRole('heading', { name: 'Permissions' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Permitted')).toHaveLength(2);
    expect(screen.getAllByText('Not permitted')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Management not permitted' }),
    ).toBeDisabled();
  });

  it('renders a denied route state when the view permission is absent', () => {
    renderPermissions(() => false);

    expect(screen.getByText('Access is not available')).toBeInTheDocument();
    expect(screen.getByText(/Backend authorization remains authoritative/)).toBeInTheDocument();
  });
});
