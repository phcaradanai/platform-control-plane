import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { repoRoot } from './paths';

describe('app-config.yaml loads and wires GitHub + permissions', () => {
  const config = parseYaml(
    fs.readFileSync(path.join(repoRoot, 'app-config.yaml'), 'utf8'),
  );

  it('is valid YAML', () => {
    expect(config).toBeTruthy();
  });

  it('configures the GitHub integration for github.com via GITHUB_TOKEN', () => {
    const github = config.integrations.github.find(
      (i: { host: string }) => i.host === 'github.com',
    );
    expect(github).toBeDefined();
    expect(github.token).toBe('${GITHUB_TOKEN}');
  });

  it('enables the permission framework', () => {
    expect(config.permission.enabled).toBe(true);
  });

  it('keeps the RepoUrlPicker-facing integration restricted to github.com only', () => {
    expect(config.integrations.github).toHaveLength(1);
  });
});

describe('backend wiring', () => {
  const indexTs = fs.readFileSync(
    path.join(repoRoot, 'packages', 'backend', 'src', 'index.ts'),
    'utf8',
  );

  it('registers the real Platform Admin / Developer permission policy, not an allow-all placeholder', () => {
    expect(indexTs).toContain('./permissions/module');
    expect(indexTs).not.toContain(
      '@backstage/plugin-permission-backend-module-allow-all-policy',
    );
  });

  it('registers the GitHub auth provider module for future sign-in', () => {
    expect(indexTs).toContain(
      '@backstage/plugin-auth-backend-module-github-provider',
    );
  });

  it('registers the built-in scaffolder GitHub actions module', () => {
    expect(indexTs).toContain(
      '@backstage/plugin-scaffolder-backend-module-github',
    );
  });
});

describe('app-config.production.yaml', () => {
  const prodConfig = parseYaml(
    fs.readFileSync(
      path.join(repoRoot, 'app-config.production.yaml'),
      'utf8',
    ),
  );

  it('uses the pg client driven entirely by POSTGRES_* environment variables', () => {
    const conn = prodConfig.backend.database.connection;
    expect(prodConfig.backend.database.client).toBe('pg');
    for (const value of Object.values(conn) as string[]) {
      expect(value).toMatch(/^\$\{POSTGRES_[A-Z_]+\}$/);
    }
  });

  it('deletes the guest provider from the merged config instead of leaving it enabled', () => {
    // `null` here is load-bearing: Backstage's config merge treats an
    // overriding `null` as "unset this key", which is what actually
    // removes app-config.yaml's `guest: {}` from the merged production
    // config - see docs/identity-and-access.md. An empty object (`{}`)
    // would re-enable it.
    expect(prodConfig.auth.providers.guest).toBeNull();
  });

  it('configures GitHub sign-in from AUTH_GITHUB_CLIENT_ID/SECRET without a bypass around the catalog', () => {
    const github = prodConfig.auth.providers.github.production;
    expect(github.clientId).toBe('${AUTH_GITHUB_CLIENT_ID}');
    expect(github.clientSecret).toBe('${AUTH_GITHUB_CLIENT_SECRET}');
    const resolver = github.signIn.resolvers[0];
    expect(resolver.resolver).toBe('usernameMatchingUserEntityName');
    expect(resolver.dangerouslyAllowSignInWithoutUserInCatalog).toBeUndefined();
  });
});
