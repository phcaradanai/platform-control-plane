import { loadConfigSchema } from '@backstage/config-loader';
import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');
const appPackageJson = path.join(repoRoot, 'packages/app/package.json');

/**
 * packages/app/src/modules/sign-in/SignInPage.tsx decides whether to show
 * the GitHub sign-in button in local development from
 * `auth.localGithubEnabled` (packages/app/config.d.ts), not from
 * `auth.providers.github` directly. That indirection exists because of a
 * real, empirically-confirmed gap in this Backstage version: the GitHub
 * auth module's own config schema marks `auth.providers.github`
 * `visibility: frontend`, but its per-environment keys
 * (`development`/`production`) are matched via JSON Schema
 * `additionalProperties`, and frontend-visibility filtering does not
 * propagate through that - `auth.providers.github.development` is
 * stripped to `{}` even when populated, so it can never be used to detect
 * "is GitHub configured" from the frontend.
 *
 * This test exercises the real schema-collection + visibility-filtering
 * pipeline (the same one `backstage-cli config:print --frontend` uses,
 * via `loadConfigSchema().process(..., { visibility: ['frontend'] })`) to
 * pin both halves of that claim: `auth.providers.github.*` stays hidden,
 * and `auth.localGithubEnabled` survives. If a Backstage upgrade changes
 * either behavior, this test - not a live click-through - is what catches
 * it.
 */
describe('frontend-visible sign-in config (real schema + visibility filtering)', () => {
  const fullConfig = {
    app: { title: 't', baseUrl: 'http://localhost:3000' },
    backend: { baseUrl: 'http://localhost:7007' },
    auth: {
      environment: 'development',
      localGithubEnabled: true,
      providers: {
        github: {
          development: {
            clientId: 'dummy-client-id',
            clientSecret: 'dummy-client-secret',
            signIn: {
              resolvers: [{ resolver: 'usernameMatchingUserEntityName' }],
            },
          },
        },
      },
    },
  };

  async function filterForFrontend(data: unknown) {
    const schema = await loadConfigSchema({
      dependencies: [],
      packagePaths: [appPackageJson],
    });
    const [processed] = schema.process(
      [{ context: 'test', data: data as any }],
      { visibility: ['frontend'] },
    );
    return processed.data as any;
  }

  it('strips auth.providers.github entirely, even with clientId/signIn set - the gap localGithubEnabled works around', async () => {
    const frontendConfig = await filterForFrontend(fullConfig);
    expect(frontendConfig.auth.providers.github).toEqual({});
  });

  it('keeps auth.localGithubEnabled visible to the frontend', async () => {
    const frontendConfig = await filterForFrontend(fullConfig);
    expect(frontendConfig.auth.localGithubEnabled).toBe(true);
  });

  it('defaults to no GitHub button when auth.localGithubEnabled is absent (default local checkout)', async () => {
    const { localGithubEnabled, ...authWithoutFlag } = fullConfig.auth;
    const frontendConfig = await filterForFrontend({
      ...fullConfig,
      auth: authWithoutFlag,
    });
    expect(frontendConfig.auth.localGithubEnabled).toBeUndefined();
  });
});
