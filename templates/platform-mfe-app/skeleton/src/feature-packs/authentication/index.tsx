import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth, useNavigation } from '@platform/sdk';
import {
  ApplicationPage,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  PageSection,
} from '@platform/ui';

import type { FeaturePack } from '../contract.js';

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The authentication provider could not complete this action.';
}

/** Keep return paths same-origin and path-only; never reflect an external URL. */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function authenticationPath(returnPath: string): string {
  return `/authentication?returnPath=${encodeURIComponent(
    safeReturnPath(returnPath),
  )}`;
}

/** Shared logout action used by authentication and dependent identity packs. */
export function SignOutButton({ label = 'Sign out' }: { label?: string }) {
  const auth = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (auth.status !== 'ready') {
    return null;
  }

  const signOut = async () => {
    setError(null);
    setPending(true);
    try {
      await auth.signOut();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        aria-busy={pending}
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {pending ? 'Signing out…' : label}
      </Button>
      {error ? (
        <p role="alert" className="max-w-sm text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * UX-only route guard. Backend/API authorization remains authoritative; this
 * component only keeps a signed-out user on the provider-neutral sign-in path.
 */
export function AuthGate({
  children,
  returnPath,
}: {
  children: ReactNode;
  returnPath?: string;
}) {
  const auth = useAuth();
  const navigation = useNavigation();
  const destination = safeReturnPath(returnPath ?? navigation.currentPath);

  if (auth.status === 'unavailable') {
    return (
      <ErrorState
        title="Authentication unavailable"
        message={auth.reason}
        retryLabel="Return home"
        onRetry={() => navigation.navigate('/')}
      />
    );
  }

  if (auth.phase === 'pending') {
    return <LoadingState label="Checking your sign-in status…" />;
  }

  if (auth.phase === 'error' && !auth.isAuthenticated) {
    return (
      <ErrorState
        title="Authentication needs attention"
        message={auth.error ?? 'The provider could not confirm your session.'}
        retryLabel="Open sign-in"
        onRetry={() => navigation.navigate(authenticationPath(destination))}
      />
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <section
        aria-labelledby="authentication-required-title"
        className="grid gap-4 rounded-lg border border-border bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 size-5 shrink-0 text-primary"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <h2 id="authentication-required-title" className="font-semibold">
              Sign in to continue
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              This screen is available after the application’s configured
              identity provider confirms your session.
            </p>
          </div>
        </div>
        <div>
          <Button
            type="button"
            onClick={() => navigation.navigate(authenticationPath(destination))}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Open sign-in
          </Button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}

export function AuthenticationScreen() {
  const auth = useAuth();
  const navigation = useNavigation();
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const returnPath = safeReturnPath(
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('returnPath'),
  );

  const signIn = async () => {
    setActionError(null);
    setPending(true);
    try {
      await auth.signIn({ returnPath });
      if (returnPath !== '/authentication') {
        navigation.navigate(returnPath);
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  const isPending = pending || auth.phase === 'pending';
  const providerError = actionError ?? auth.error;
  const displayName = auth.user?.displayName ?? auth.user?.id ?? 'Current user';

  return (
    <ApplicationPage>
      <PageHeader
        title="Authentication"
        description="A provider-neutral entry point for sign-in, session state, and sign-out. The configured identity provider remains the authority for every session decision."
        status={
          <Badge variant={auth.status === 'ready' ? 'outline' : 'secondary'}>
            {auth.status === 'ready'
              ? auth.isAuthenticated
                ? 'Authenticated'
                : 'Signed out'
              : 'Provider unavailable'}
          </Badge>
        }
      />

      <PageSection>
        {auth.status === 'unavailable' ? (
          <ErrorState
            title="Authentication provider unavailable"
            message={`${auth.reason ?? 'No provider is configured.'} Connect an AuthAdapter through the platform runtime before enabling end-user sign-in.`}
            retryLabel="Return home"
            onRetry={() => navigation.navigate('/')}
          />
        ) : auth.isAuthenticated ? (
          <Card className="grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
            <Avatar name={displayName} src={auth.user?.avatarUrl} size="lg" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold">You are signed in</h2>
              <p className="break-words text-sm text-muted-foreground">
                {displayName}
                {auth.user?.email ? ` · ${auth.user.email}` : ''}
              </p>
              <p className="break-all text-xs text-muted-foreground">
                Identity: {auth.user?.id ?? 'Unavailable'}
              </p>
            </div>
            <SignOutButton />
          </Card>
        ) : isPending ? (
          <LoadingState label="Signing in…" />
        ) : providerError ? (
          <ErrorState
            title="Sign-in could not be completed"
            message={providerError}
            retryLabel="Try sign-in again"
            onRetry={() => void signIn()}
          />
        ) : (
          <Card className="grid max-w-2xl gap-5 p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <LogIn className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold">Sign in to this application</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Continue with the identity provider configured for this
                  application. You will return to the requested page after a
                  successful sign-in.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={isPending} onClick={() => void signIn()}>
                <LogIn className="size-4" aria-hidden="true" />
                Sign in
              </Button>
              {returnPath !== '/' ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigation.navigate(returnPath)}
                >
                  Continue without signing in
                </Button>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Frontend sign-in state improves navigation and feedback; API
              authorization remains the security boundary.
            </p>
          </Card>
        )}
      </PageSection>
    </ApplicationPage>
  );
}

export const authenticationFeaturePack = {
  id: 'authentication',
  route: '/authentication',
  navigation: {
    label: 'Authentication',
    description: 'Sign-in and current session state.',
    icon: ShieldCheck,
  },
  screen: AuthenticationScreen,
  dependencies: {
    platform: ['@platform/ui', '@platform/sdk'],
  },
} satisfies FeaturePack;
