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
  docs: {
    autodocs: 'tag',
  },
};

export default {
  ...config,
  viteFinal: async viteConfig =>
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
    }),
};
