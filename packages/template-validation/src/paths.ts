import path from 'path';

// This package only runs under `backstage-cli package test` (Jest), never
// as a bundled runtime plugin, so `__dirname` reliably points at
// packages/template-validation/src and `resolvePackagePath` (which
// resolves relative to a published package's own name) doesn't apply here.
// eslint-disable-next-line no-restricted-syntax
export const repoRoot = path.resolve(__dirname, '..', '..', '..');
export const templateDir = path.join(
  repoRoot,
  'templates',
  'platform-mfe-app',
);
export const skeletonDir = path.join(templateDir, 'skeleton');
