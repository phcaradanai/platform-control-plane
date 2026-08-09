import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { templateDir, skeletonDir } from './paths';
import { computePlatformUiFingerprint } from './vendorFingerprint';

// Kept outside skeleton/ deliberately: skeleton/vendor/** is copied
// verbatim into every generated app (see template.test.ts), so anything
// added there ships into generated repos.
const manifestPath = path.join(templateDir, 'vendor-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const tarballPath = path.join(skeletonDir, manifest.tarball);

describe('@platform/ui vendor tarball staleness', () => {
  it('matches the fingerprint of the platform-ui source it was built from', () => {
    // Regression guard: template.test.ts only asserts a tarball is present
    // and pinned, not that it's current. If packages/platform-ui changes
    // without the tarball being rebuilt and re-vendored, this fails - see
    // vendor-manifest.json's `note` for the re-vendoring steps.
    expect(computePlatformUiFingerprint()).toBe(manifest.sourceFingerprint);
  });

  it('is pinned in the skeleton lockfile with a matching integrity hash', () => {
    const actualIntegrity = `sha512-${crypto
      .createHash('sha512')
      .update(fs.readFileSync(tarballPath))
      .digest('base64')}`;

    const lock = JSON.parse(
      fs.readFileSync(path.join(skeletonDir, 'package-lock.json'), 'utf8'),
    );
    const lockedIntegrity =
      lock.packages['node_modules/@platform/ui']?.integrity;

    // Regression test for the Phase 2.1 EINTEGRITY bug: `npm install` does
    // not re-hash an existing file: dependency, so rebuilding the tarball
    // without deleting and regenerating package-lock.json leaves a stale
    // integrity hash that fails `npm ci` on a clean checkout.
    expect(lockedIntegrity).toBe(actualIntegrity);
  });
});
