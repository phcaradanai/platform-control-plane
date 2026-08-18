import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';
import UnoCSS from 'unocss/vite';
import { mergeConfig } from 'vite';
import { presetWind3 } from 'unocss';

import {
  platformUnoPreflights,
  platformUnoShortcuts,
  platformUnoTheme,
} from '../src/uno-preset.js';

const storybookDir = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(storybookDir, '../src');
const repoRoot = path.resolve(storybookDir, '../../..');
const featurePackSourceDir = path.join(
  repoRoot,
  'templates/platform-mfe-app/skeleton/src/feature-packs',
);

const config: StorybookConfig = {
  stories: ['../src/catalog/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
};

const viteFinal: NonNullable<StorybookConfig['viteFinal']> = async viteConfig =>
  mergeConfig(viteConfig, {
    resolve: {
      alias: [
        {
          find: '@platform/feature-packs/dashboard',
          replacement: path.join(featurePackSourceDir, 'dashboard/index.tsx'),
        },
        {
          find: '@platform/feature-packs/settings',
          replacement: path.join(featurePackSourceDir, 'settings/index.tsx'),
        },
        {
          find: '@platform/feature-packs/authentication',
          replacement: path.join(
            featurePackSourceDir,
            'authentication/index.tsx',
          ),
        },
        {
          find: '@platform/feature-packs/profile',
          replacement: path.join(featurePackSourceDir, 'profile/index.tsx'),
        },
        {
          find: '@platform/feature-packs/rbac',
          replacement: path.join(featurePackSourceDir, 'rbac/index.tsx'),
        },
        {
          find: '@platform/feature-packs/reports',
          replacement: path.join(featurePackSourceDir, 'reports/index.tsx'),
        },
        {
          find: '@platform/feature-packs/history',
          replacement: path.join(featurePackSourceDir, 'history/index.tsx'),
        },
        {
          find: '@platform/feature-packs/audit-log',
          replacement: path.join(featurePackSourceDir, 'audit-log/index.tsx'),
        },
        {
          find: '@platform/sdk',
          replacement: path.join(
            repoRoot,
            'packages/platform-sdk/src/index.ts',
          ),
        },
        {
          find: '@platform/ui/theme.css',
          replacement: path.join(sourceDir, 'styles/theme.css'),
        },
        {
          find: '@platform/ui/uno-preset',
          replacement: path.join(sourceDir, 'uno-preset.ts'),
        },
        {
          find: '@platform/ui',
          replacement: path.join(sourceDir, 'index.ts'),
        },
      ],
    },
    plugins: [
      UnoCSS({
        presets: [presetWind3()],
        theme: platformUnoTheme,
        shortcuts: platformUnoShortcuts,
        preflights: platformUnoPreflights,
        content: {
          filesystem: [
            path.join(sourceDir, '**/*.{ts,tsx}'),
            path.join(storybookDir, '**/*.{ts,tsx}'),
          ],
        },
      }),
    ],
  });

export default {
  ...config,
  viteFinal,
};
