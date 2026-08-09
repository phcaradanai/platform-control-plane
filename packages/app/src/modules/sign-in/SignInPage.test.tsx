import { renderInTestApp } from '@backstage/frontend-test-utils';
import { screen, waitFor } from '@testing-library/react';
import { PlatformSignInPageContent } from './SignInPage';

function renderSignIn(auth: {
  environment?: string;
  localGithubEnabled?: boolean;
}) {
  return renderInTestApp(
    <PlatformSignInPageContent onSignInSuccess={jest.fn()} />,
    {
      config: {
        app: { title: 'Test', baseUrl: 'http://localhost:3000' },
        backend: { baseUrl: 'http://localhost:7007' },
        auth,
      },
    },
  );
}

describe('PlatformSignInPageContent', () => {
  it('offers Guest only on a default local checkout (development, GitHub not configured) - the bug this fixes', async () => {
    renderSignIn({ environment: 'development' });

    await waitFor(() => {
      expect(screen.getByText('Guest')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Enter' })).toBeInTheDocument();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Sign In' }),
    ).not.toBeInTheDocument();
  });

  it('offers GitHub and Guest in local development once auth.localGithubEnabled is set', async () => {
    renderSignIn({ environment: 'development', localGithubEnabled: true });

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
    renderSignIn({ environment: 'production' });

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

  it('treats an unset auth.environment as non-development - GitHub only, no Guest button', async () => {
    renderSignIn({});

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
  });

  it('ignores auth.localGithubEnabled outside development (still GitHub-only, no duplicate button)', async () => {
    renderSignIn({ environment: 'production', localGithubEnabled: true });

    await waitFor(() => {
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest')).not.toBeInTheDocument();
  });
});
