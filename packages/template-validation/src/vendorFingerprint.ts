import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { repoRoot } from './paths';

const platformUiDir = path.join(repoRoot, 'packages', 'platform-ui');

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
 * Deterministic fingerprint of everything that determines @platform/ui's
 * built output: its source tree, package.json (version/dependencies), and
 * the asset-copy build script. templates/platform-mfe-app/vendor-manifest.json
 * records the fingerprint at the time vendor/platform-ui-*.tgz was last
 * built, so a test can detect the tarball going stale relative to the
 * package source (as opposed to `template.test.ts`'s checks, which only
 * confirm a tarball is present and pinned, not that it's current).
 * Line endings are normalized so this is stable across CRLF checkouts.
 */
export function computePlatformUiFingerprint(): string {
  const inputs = [
    ...listFilesRecursive(path.join(platformUiDir, 'src')),
    path.join(platformUiDir, 'package.json'),
    path.join(platformUiDir, 'scripts', 'copy-assets.mjs'),
  ]
    .map(abs => path.relative(platformUiDir, abs).split(path.sep).join('/'))
    .sort();

  const hash = crypto.createHash('sha256');
  for (const rel of inputs) {
    const content = fs
      .readFileSync(path.join(platformUiDir, rel), 'utf8')
      .replace(/\r\n/g, '\n');
    hash.update(rel);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return hash.digest('hex');
}
