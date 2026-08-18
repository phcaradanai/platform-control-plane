import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlatformProvider, type AuthAdapter } from '@platform/sdk';
import { ProfileScreen } from './index';
import { appInfo } from '../../lib/app-info';

function renderProfile(snapshot: {
  isAuthenticated: boolean;
  user: { id: string; displayName?: string; email?: string } | null;
  phase?: 'idle' | 'pending' | 'error';
  error?: string;
}) {
  const auth: AuthAdapter = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    signIn: async () => {},
    signOut: async () => {},
  };

  return render(
    <PlatformProvider config={{ app: appInfo, adapters: { auth } }}>
      <ProfileScreen />
    </PlatformProvider>,
  );
}

describe('profile feature pack', () => {
  it('renders generic identity details for the current user', () => {
    renderProfile({
      isAuthenticated: true,
      user: {
        id: 'user:default/ada',
        displayName: 'Ada Lovelace',
        email: 'ada@example.com',
      },
    });

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Identity summary')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByText('user:default/ada')).toBeInTheDocument();
  });

  it('protects the page with signed-out and pending states', () => {
    renderProfile({ isAuthenticated: false, user: null });
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();

    renderProfile({ isAuthenticated: false, user: null, phase: 'pending' });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking your sign-in status',
    );
  });
});
