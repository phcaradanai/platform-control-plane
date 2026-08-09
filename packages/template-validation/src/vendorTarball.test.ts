import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { templateDir, skeletonDir } from './paths';
import { computePackageFingerprint } from './vendorFingerprint';

// Kept outside skeleton/ deliberately: skeleton/vendor/** is copied
// verbatim into every generated app (see template.test.ts), so anything
// added there ships into generated repos.
interface VendorEntry {
  package: string;
  packageDir: string;
  tarball: string;
  sourceFingerprint: string;
}

const manifestPath = path.join(templateDir, 'vendor-manifest.json');
const manifest: { vendors: VendorEntry[] } = JSON.parse(
  fs.readFileSync(manifestPath, 'utf8'),
);

describe.each(manifest.vendors)(
  '$package vendor tarball staleness',
  ({ package: packageName, packageDir, tarball, sourceFingerprint }) => {
    const tarballPath = path.join(skeletonDir, tarball);

    it('matches the fingerprint of the source it was built from', () => {
      // Regression guard: template.test.ts only asserts a tarball is present
      // and pinned, not that it's current. If the package's source changes
      // without its tarball being rebuilt and re-vendored, this fails - see
      // vendor-manifest.json's `note` for the re-vendoring steps.
      expect(computePackageFingerprint(packageDir)).toBe(sourceFingerprint);
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
        lock.packages[`node_modules/${packageName}`]?.integrity;

      // Regression test for the Phase 2.1 EINTEGRITY bug: `npm install` does
      // not re-hash an existing file: dependency, so rebuilding a tarball
      // without deleting and regenerating package-lock.json leaves a stale
      // integrity hash that fails `npm ci` on a clean checkout.
      expect(lockedIntegrity).toBe(actualIntegrity);
    });
  },
);
