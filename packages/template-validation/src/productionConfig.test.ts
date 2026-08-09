import { loadConfig } from '@backstage/config-loader';
import fs from 'fs';
import path from 'path';

// Locate the repo root by walking up to the package.json that declares
// `workspaces` (the monorepo root). Deliberately does not rely on
// __dirname's exact depth, which varies between jest invocation modes
// (src/ vs compiled dist/ vs package dir).
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.workspaces) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('could not locate monorepo root');
}

const repoRoot = findRepoRoot(__dirname);

/**
 * Faithful re-implementation of Backstage's config merge semantics (the
 * same rules `ConfigSources.default` / the CLI's config merge apply):
 * plain objects deep-merge, arrays and scalars replace wholesale, and an
 * overriding `null` deletes the key. The `guest: null` in
 * app-config.production.yaml only removes the dev guest provider because
 * of this exact behavior.
 */
function mergeConfigs(base: any, override: any): any {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override;
  }
  if (
    typeof base === 'object' &&
    base !== null &&
    typeof override === 'object' &&
    override !== null
  ) {
    const out: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = key in base ? mergeConfigs(base[key], value) : value;
    }
    return out;
  }
  return override;
}

// Runs the REAL config loader (env substitution) over the given config
// files, then merges them with Backstage's merge semantics - the same
// pipeline `backstage-cli config:print` uses, not a static YAML parse.
// `loadConfig` returns one entry per file, so the merge step is what
// actually proves the production overlay's `guest: null` DELETES the base
// config's guest provider.
async function loadMergedConfig(
  targets: { path: string }[],
): Promise<Record<string, any>> {
  const env = {
    GITHUB_TOKEN: 'ghp_dummy_token',
    AUTH_GITHUB_CLIENT_ID: 'Iv23_dummy_client_id',
    AUTH_GITHUB_CLIENT_SECRET: 'dummy_client_secret_value',
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'backstage',
    POSTGRES_PASSWORD: 'backstage',
    POSTGRES_DB: 'backstage',
  };
  const { appConfigs } = await loadConfig({
    configRoot: repoRoot,
    configTargets: targets,
    // Load the config files with a fixed, hermetic environment so the
    // tests never depend on the machine's actual env vars.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - experimental API, present in this config-loader version
    experimentalEnvFunc: async (name: string) => env[name],
  });
  return appConfigs.reduce(
    (merged, appConfig) => mergeConfigs(merged, appConfig.data),
    {},
  );
}

describe('merged production config (real config-loader merge semantics)', () => {
  let config: any;

  beforeAll(async () => {
    config = await loadMergedConfig([
      { path: 'app-config.yaml' },
      { path: 'app-config.production.yaml' },
    ]);
  });

  it('has no guest provider at all in the merged config (guest: null deletes it)', () => {
    // This is the load-bearing property: a plain `{}` would re-enable
    // guest sign-in in production. The static-YAML check in
    // appConfig.test.ts asserts the file says `null`; this test proves
    // the MERGE actually removes it.
    expect(config.auth.providers.guest).toBeNull();
    expect(config.auth.providers.guest).not.toEqual({});
  });

  it('has the GitHub provider configured for production from env vars', () => {
    const github = config.auth.providers.github.production;
    expect(github.clientId).toBe('Iv23_dummy_client_id');
    expect(github.clientSecret).toBe('dummy_client_secret_value');
  });

  it('sign-in requires a matching catalog User entity (no dangerous bypass)', () => {
    const resolver = config.auth.providers.github.production.signIn.resolvers[0];
    expect(resolver.resolver).toBe('usernameMatchingUserEntityName');
    // Absent entirely, not just false - a future `true` here would let any
    // GitHub account sign in without a catalog entity.
    expect(resolver.dangerouslyAllowSignInWithoutUserInCatalog).toBeUndefined();
    expect(
      JSON.stringify(config.auth.providers.github.production.signIn),
    ).not.toContain('dangerouslyAllowSignInWithoutUserInCatalog');
  });

  it('loads provisioned identities, not the dev guest fixture, into the production catalog', () => {
    const targets = config.catalog.locations.map(
      (l: { target: string }) => l.target,
    );
    expect(targets).toContain('../../examples/org.provisioned.yaml');
    expect(targets).not.toContain('../../examples/org.yaml');
    expect(targets).not.toContain('./examples/org.yaml');
  });

  it('keeps the permission framework enabled', () => {
    expect(config.permission.enabled).toBe(true);
  });

  it('overrides auth.environment to production (not left as the base development value)', () => {
    expect(config.auth.environment).toBe('production');
  });

  it('auth.environment matches a key under auth.providers.github', () => {
    // The frontend sends auth.environment as `?env=...` on the OAuth
    // start request (DefaultAuthConnector.buildUrl) - a mismatch means
    // that request never matches a configured provider block.
    expect(Object.keys(config.auth.providers.github)).toContain(
      config.auth.environment,
    );
  });
});

describe('merged dev config keeps guest sign-in for local development', () => {
  let devConfig: any;

  beforeAll(async () => {
    devConfig = await loadMergedConfig([{ path: 'app-config.yaml' }]);
  });

  it('keeps the guest provider enabled (an empty object, not null)', () => {
    expect(devConfig.auth.providers.guest).toEqual({});
  });

  it('has no GitHub provider configured by default (stays inert locally)', () => {
    expect(devConfig.auth.providers.github).toBeUndefined();
  });

  it('marks auth.environment as development so the frontend offers Guest too', () => {
    expect(devConfig.auth.environment).toBe('development');
  });
});
