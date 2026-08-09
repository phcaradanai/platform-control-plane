import { renderInTestApp } from '@backstage/frontend-test-utils';
import { screen, waitFor } from '@testing-library/react';
import { PlatformSignInPageContent } from './SignInPage';

function renderSignIn(environment?: string) {
  return renderInTestApp(
    <PlatformSignInPageContent onSignInSuccess={jest.fn()} />,
    {
      config: {
        app: { title: 'Test', baseUrl: 'http://localhost:3000' },
        backend: { baseUrl: 'http://localhost:7007' },
        auth: environment ? { environment } : {},
      },
    },
  );
}

describe('PlatformSignInPageContent', () => {
  it('offers GitHub and Guest in local development (auth.environment: development)', async () => {
    renderSignIn('development');

    await waitFor(() => {
      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sign In' }),
    ).toBeInTheDocument();
  });

  it('offers GitHub only in production (auth.environment: production) - no Guest button', async () => {
    renderSignIn('production');

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: 'Sign In' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Enter' }),
    ).not.toBeInTheDocument();
  });

  it('treats an unset auth.environment as non-development - no Guest button', async () => {
    renderSignIn(undefined);

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
  });
});
