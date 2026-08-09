import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  PlatformProvider,
  useAuth,
  usePermissions,
  usePlatformApp,
  usePlatformRuntime,
  useTenant,
} from '@platform/sdk';

import { appInfo } from './app-info';

function Probe() {
  const app = usePlatformApp();
  const { runtimeMode } = usePlatformRuntime();
  const auth = useAuth();
  const permissions = usePermissions();
  const tenant = useTenant();

  return (
    <dl>
      <dd data-testid="app-id">{app.id}</dd>
      <dd data-testid="runtime-mode">{runtimeMode}</dd>
      <dd data-testid="auth-status">{auth.status}</dd>
      <dd data-testid="can-anything">{String(permissions.can('anything'))}</dd>
      <dd data-testid="tenant-status">{tenant.status}</dd>
    </dl>
  );
}

// This exercises the real @platform/sdk vendored into this app (not a
// mock) - proof that the tarball + this app's own wiring in app.tsx behave
// as documented, not just that the package builds in isolation.
describe('@platform/sdk integration', () => {
  it('reads application identity through from platform-app.json', () => {
    render(
      <PlatformProvider config={{ app: appInfo }}>
        <Probe />
      </PlatformProvider>,
    );
    expect(screen.getByTestId('app-id')).toHaveTextContent(appInfo.id);
  });

  it('defaults to standalone runtime mode', () => {
    render(
      <PlatformProvider config={{ app: appInfo }}>
        <Probe />
      </PlatformProvider>,
    );
    expect(screen.getByTestId('runtime-mode')).toHaveTextContent('standalone');
  });

  it('reports auth/permissions/tenant unavailable with no provider configured, failing closed', () => {
    render(
      <PlatformProvider config={{ app: appInfo }}>
        <Probe />
      </PlatformProvider>,
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('unavailable');
    expect(screen.getByTestId('can-anything')).toHaveTextContent('false');
    expect(screen.getByTestId('tenant-status')).toHaveTextContent('unavailable');
  });

  it('rejects signIn/signOut when auth is unavailable', async () => {
    let captured: ReturnType<typeof useAuth> | undefined;
    function Capture() {
      const auth = useAuth();
      useEffect(() => {
        captured = auth;
      });
      return null;
    }
    render(
      <PlatformProvider config={{ app: appInfo }}>
        <Capture />
      </PlatformProvider>,
    );
    await expect(captured?.signIn()).rejects.toThrow(/unavailable/i);
    await expect(captured?.signOut()).rejects.toThrow(/unavailable/i);
  });
});
