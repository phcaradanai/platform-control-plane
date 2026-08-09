import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
// js-yaml is the exact parser Backstage's catalog uses (via
// @backstage/catalog-model) - stricter than the `yaml` package about plain
// scalars containing ": ", so this is the parser that must accept the
// provisioning output.
import { loadAll as loadAllYaml } from 'js-yaml';

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
const script = path.join(repoRoot, 'scripts', 'provision-identities.mjs');

function runScript(args: string[]): { stdout: string; status: number } {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    return { stdout, status: 0 };
  } catch (err: any) {
    return {
      stdout: `${err.stderr ?? ''}${err.stdout ?? ''}`,
      status: err.status ?? 1,
    };
  }
}

// Renders into a temp output file (the script's real usage - it writes the
// YAML to --output, it does not print it to stdout) and returns the parsed
// entities. Throws if the YAML is rejected by the catalog's own parser.
function renderToTempFile(args: string[]): { entities: any[]; raw: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'provision-'));
  const output = path.join(dir, 'org.generated.yaml');
  const { stdout, status } = runScript([...args, '--output', output]);
  if (status !== 0) {
    throw new Error(`provision-identities failed (${status}): ${stdout}`);
  }
  const raw = fs.readFileSync(output, 'utf8');
  return { entities: loadAllYaml(raw), raw };
}

describe('scripts/provision-identities.mjs (provisioning path)', () => {
  it('renders both groups plus one User entity per input user with the right memberOf', () => {
    const { entities } = renderToTempFile([
      '--users',
      'alice:platform-team;bob:platform-team,platform-admins',
    ]);

    const users = entities.filter(e => e?.kind === 'User');
    const groups = entities.filter(e => e?.kind === 'Group');

    expect(users).toHaveLength(2);
    expect(groups.map((g: any) => g.metadata.name).sort()).toEqual([
      'platform-admins',
      'platform-team',
    ]);

    const alice = users.find((u: any) => u.metadata.name === 'alice');
    const bob = users.find((u: any) => u.metadata.name === 'bob');
    expect(alice.spec.memberOf).toEqual(['platform-team']);
    expect(bob.spec.memberOf).toEqual(['platform-team', 'platform-admins']);
  });

  it('quotes user descriptions so the strict catalog parser accepts them', () => {
    // Regression guard: an unquoted plain scalar containing "GitHub login:
    // <user>" (a ": " inside a plain scalar) is rejected by js-yaml with
    // "Nested mappings are not allowed in compact mappings", which made the
    // catalog drop every provisioned User entity.
    const { raw, entities } = renderToTempFile(['--users', 'alice:platform-team']);
    expect(raw).toContain(
      'description: "Provisioned control-plane operator (GitHub login: alice)"',
    );
    expect(entities.filter(e => e?.kind === 'User')).toHaveLength(1);
  });

  it('accepts the same input as a JSON file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'provision-'));
    const input = path.join(dir, 'org.json');
    fs.writeFileSync(
      input,
      JSON.stringify({
        users: [
          { github: 'alice', groups: ['platform-team'] },
          { github: 'bob', groups: ['platform-admins'] },
        ],
      }),
    );

    const { entities } = renderToTempFile(['--input', input]);
    const users = entities.filter(e => e?.kind === 'User');
    expect(users.map((u: any) => u.metadata.name)).toEqual(['alice', 'bob']);
  });

  it('with no input renders a groups-only skeleton (nobody can sign in, nobody is an admin)', () => {
    const { entities } = renderToTempFile([]);
    expect(entities.filter(e => e?.kind === 'User')).toHaveLength(0);
    expect(entities.filter(e => e?.kind === 'Group')).toHaveLength(2);
  });

  it('rejects an unknown group', () => {
    const { stdout, status } = runScript(['--users', 'alice:platform-team,root']);
    expect(status).not.toBe(0);
    expect(stdout).toContain('unknown group "root"');
  });

  it('rejects a non-lowercase username (entity name must match the GitHub login)', () => {
    const { stdout, status } = runScript(['--users', 'Alice:platform-team']);
    expect(status).not.toBe(0);
    expect(stdout).toContain('must be lowercase');
  });

  it('rejects an invalid username shape', () => {
    // `=` form because a value starting with "-" is ambiguous to parseArgs.
    const { stdout, status } = runScript(['--users=-bad:platform-team']);
    expect(status).not.toBe(0);
    expect(stdout).toContain('invalid GitHub username');
  });

  it('rejects duplicate usernames', () => {
    const { stdout, status } = runScript([
      '--users',
      'alice:platform-team;alice:platform-admins',
    ]);
    expect(status).not.toBe(0);
    expect(stdout).toContain('duplicate GitHub username "alice"');
  });

  it('--check passes for the committed examples/org.provisioned.yaml skeleton', () => {
    const { stdout, status } = runScript([
      '--check',
      '--output',
      'examples/org.provisioned.yaml',
    ]);
    expect(status).toBe(0);
    expect(stdout).toContain('matches provisioning input');
  });

  it('--check fails when the target file is tampered with', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'provision-'));
    const target = path.join(dir, 'org.yaml');
    fs.writeFileSync(target, '# tampered\n');

    const { stdout, status } = runScript(['--check', '--output', target]);
    expect(status).not.toBe(0);
    expect(stdout).toContain('out of date or tampered');
  });

  it('committed skeleton is valid YAML with both groups and zero users', () => {
    const raw = fs.readFileSync(
      path.join(repoRoot, 'examples', 'org.provisioned.yaml'),
      'utf8',
    );
    const entities = loadAllYaml(raw) as any[];
    const groups = entities.filter(e => e?.kind === 'Group');
    expect(groups.map((g: any) => g.metadata.name).sort()).toEqual([
      'platform-admins',
      'platform-team',
    ]);
    expect(entities.filter(e => e?.kind === 'User')).toHaveLength(0);
  });
});
