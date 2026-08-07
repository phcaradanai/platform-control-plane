import fs from 'fs';
import path from 'path';
import { repoRoot } from './paths';

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.yarn',
  'dist',
  'dist-types',
  '.omc',
  'coverage',
]);

// Developer-local files that are gitignored by design (see the
// ".gitignores local env files" test below) and may legitimately contain
// real secrets on a contributor's machine. The requirement is "nothing
// committed", not "nothing on disk" - scanning these would turn a
// developer's own .env into a false positive.
const EXCLUDED_FILES = new Set(['.env', 'app-config.local.yaml']);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.ico',
  '.jpg',
  '.jpeg',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
]);

// Patterns for real, usable secret material - not env-var placeholders
// like `${GITHUB_TOKEN}` or documentation prose that merely mentions a
// variable name.
const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/, // GitHub personal access token
  /gho_[A-Za-z0-9]{20,}/, // GitHub OAuth token
  /github_pat_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(path.join(dir, entry.name), files);
      }
      continue;
    }
    files.push(path.join(dir, entry.name));
  }
  return files;
}

describe('no committed secrets', () => {
  const files = walk(repoRoot);

  it('contains no real secret-shaped values in any tracked-candidate file', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (EXCLUDED_FILES.has(path.basename(file))) continue;
      if (BINARY_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      const content = fs.readFileSync(file, 'utf8');
      // eslint-disable-next-line no-continue
      if (content.includes('\0')) continue; // skip binary
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(content)) {
          offenders.push(`${file}: matches ${pattern}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('ships .env and app-config.local.yaml as .example templates', () => {
    // .env / app-config.local.yaml themselves are gitignored and may exist
    // locally (e.g. after following getting-started.md) - only the
    // .example templates are required to exist and be tracked.
    expect(fs.existsSync(path.join(repoRoot, '.env.example'))).toBe(true);
    expect(
      fs.existsSync(path.join(repoRoot, 'app-config.local.yaml.example')),
    ).toBe(true);
  });

  it('gitignores local env files and *.local.yaml overrides', () => {
    const gitignore = fs.readFileSync(
      path.join(repoRoot, '.gitignore'),
      'utf8',
    );
    expect(gitignore).toContain('.env');
    expect(gitignore).toContain('*.local.yaml');
  });

  it('references GitHub token/client secret only via env var substitution, never literal values', () => {
    for (const configFile of [
      'app-config.yaml',
      'app-config.local.yaml.example',
      '.env.example',
    ]) {
      const content = fs.readFileSync(
        path.join(repoRoot, configFile),
        'utf8',
      );
      expect(content).not.toMatch(/(token|secret|password)\s*[:=]\s*['"]?\w{16,}/i);
    }
  });
});
