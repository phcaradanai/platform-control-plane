import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { repoRoot } from './paths';

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(abs));
    } else {
      out.push(abs);
    }
  }
  return out;
}

/**
 * Deterministic fingerprint of everything that determines a vendored
 * package's built output: its source tree, package.json (version/dependencies),
 * and its asset-copy build script (if it has one, e.g. @platform/ui's
 * scripts/copy-assets.mjs). templates/platform-mfe-app/vendor-manifest.json
 * records the fingerprint at the time each package's tarball was last built,
 * so a test can detect a tarball going stale relative to the package source
 * (as opposed to template.test.ts's checks, which only confirm a tarball is
 * present and pinned, not that it's current). Line endings are normalized so
 * this is stable across CRLF checkouts.
 *
 * @param packageDir path to the package, relative to the repo root (e.g. "packages/platform-ui")
 */
export function computePackageFingerprint(packageDir: string): string {
  const absDir = path.join(repoRoot, packageDir);
  const copyAssetsScript = path.join(absDir, 'scripts', 'copy-assets.mjs');

  const inputs = [
    ...listFilesRecursive(path.join(absDir, 'src')),
    path.join(absDir, 'package.json'),
    ...(fs.existsSync(copyAssetsScript) ? [copyAssetsScript] : []),
  ]
    .map(abs => path.relative(absDir, abs).split(path.sep).join('/'))
    .sort();

  const hash = crypto.createHash('sha256');
  for (const rel of inputs) {
    const content = fs
      .readFileSync(path.join(absDir, rel), 'utf8')
      .replace(/\r\n/g, '\n');
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}
