import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  PlatformProvider,
  type AuthAdapter,
} from '@platform/sdk';
import { AuthenticationScreen } from './index';
import { appInfo } from '../../lib/app-info';

function renderAuthentication(auth?: AuthAdapter) {
  return render(
    <PlatformProvider config={{ app: appInfo, adapters: auth ? { auth } : {} }}>
      <AuthenticationScreen />
    </PlatformProvider>,
  );
}

function readyAuth(
  isAuthenticated: boolean,
): { adapter: AuthAdapter; signIn: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> } {
  const signIn = vi.fn().mockResolvedValue(undefined);
  const signOut = vi.fn().mockResolvedValue(undefined);
  const snapshot = {
    isAuthenticated,
    user: isAuthenticated
      ? { id: 'user:default/ada', displayName: 'Ada Lovelace', email: 'ada@example.com' }
      : null,
  };

  return {
    adapter: {
      getSnapshot: () => snapshot,
      subscribe: () => () => {},
      signIn,
      signOut,
    },
    signIn,
    signOut,
  };
}

describe('authentication feature pack', () => {
  it('renders a clear unavailable state without a provider', () => {
    renderAuthentication();

    expect(screen.getByRole('heading', { name: 'Authentication' })).toBeInTheDocument();
    expect(screen.getByText('Provider unavailable')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Authentication provider unavailable' }),
    ).toBeInTheDocument();
  });

  it('wires the signed-out action to the platform auth adapter', async () => {
    const user = userEvent.setup();
    const auth = readyAuth(false);
    renderAuthentication(auth.adapter);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(auth.signIn).toHaveBeenCalledWith({ returnPath: '/' });
  });

  it('renders authenticated identity and wires logout', async () => {
    const user = userEvent.setup();
    const auth = readyAuth(true);
    renderAuthentication(auth.adapter);

    expect(screen.getByText('You are signed in')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace · ada@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
