import { SignInPage, type IdentityProviders } from '@backstage/core-components';
import { configApiRef, githubAuthApiRef, useApi } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint, type SignInPageProps } from '@backstage/plugin-app-react';

const githubProvider = {
  id: 'github-auth-provider',
  title: 'GitHub',
  message: 'Sign in using your GitHub account',
  apiRef: githubAuthApiRef,
};

/**
 * `auth.environment` is @backstage/plugin-auth-backend's own frontend-visible
 * config key (`visibility: frontend` in its schema) - app-config.yaml sets it
 * to `development`, app-config.production.yaml to `production`. It is not
 * just a UI label: `githubAuthApiRef`'s connector appends it as `?env=...`
 * on every request to the backend's `/api/auth/github/start` (etc.) -
 * `DefaultAuthConnector.buildUrl` in
 * @backstage/plugin-app/dist/packages/core-app-api/.../DefaultAuthConnector -
 * which is how the backend picks the matching
 * `auth.providers.github.<env>` block, so it must match a key under
 * `auth.providers.github` wherever GitHub is configured (see the config
 * files' own comments). It mirrors the same environment split that already
 * governs `auth.providers.guest` (present locally, `null`-deleted in
 * production - see docs/identity-and-access.md), so the sign-in page never
 * offers a Guest button that the backend would reject.
 *
 * In production, GitHub is always configured (required for anyone to sign
 * in at all - see app-config.production.yaml), so the button is shown
 * unconditionally there. In local development, GitHub is optional (see
 * app-config.local.yaml.example) and `auth.providers.github` can't be
 * probed directly from the frontend to see whether it's set - see
 * config.d.ts's `auth.localGithubEnabled` doc comment for why. So local
 * development additionally requires that companion flag before showing
 * the button, which keeps the default `yarn start` (nothing configured)
 * from offering a GitHub button that would fail with "No auth provider
 * registered for 'github'" the moment it's clicked.
 */
export function PlatformSignInPageContent(props: SignInPageProps) {
  const configApi = useApi(configApiRef);
  const isDevelopment =
    configApi.getOptionalString('auth.environment') === 'development';
  const localGithubEnabled =
    configApi.getOptionalBoolean('auth.localGithubEnabled') ?? false;

  let providers: IdentityProviders;
  if (!isDevelopment) {
    providers = [githubProvider];
  } else if (localGithubEnabled) {
    providers = ['guest', githubProvider];
  } else {
    providers = ['guest'];
  }

  return <SignInPage {...props} providers={providers} />;
}

/**
 * Overrides the app plugin's built-in sign-in page (which hardcodes
 * `providers: ['guest']` regardless of environment) so GitHub sign-in is
 * actually reachable from the UI. Platform Admin / Developer remain
 * post-login roles derived from catalog group membership by
 * PlatformAccessPolicy (packages/backend/src/permissions/policy.ts) - this
 * only changes which sign-in buttons are offered, not what a signed-in user
 * can do.
 */
export const PlatformSignInPage = SignInPageBlueprint.make({
  params: {
    loader: async () => PlatformSignInPageContent,
  },
});
