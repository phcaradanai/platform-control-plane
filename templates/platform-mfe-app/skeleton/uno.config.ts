import {
  platformUnoPreflights,
  platformUnoShortcuts,
  platformUnoTheme,
} from '@platform/ui/uno-preset';
import { defineConfig, presetWind3 } from 'unocss';

/**
 * UnoCSS config for a Platform MFE application. The theme, shortcuts and
 * preflights come from the shared @platform/ui package so every generated
 * app uses the same semantic tokens, component styling, and motion
 * standards. Product-specific additions (extra colors, fonts, shortcuts)
 * belong here, not in the shared package.
 */
export default defineConfig({
  presets: [presetWind3()],
  theme: platformUnoTheme,
  shortcuts: platformUnoShortcuts,
  preflights: platformUnoPreflights,
  // The shared primitives live in node_modules/@platform/ui/dist and are
  // compiled from JSX to plain className strings - UnoCSS must scan them
  // so utilities used inside the package are generated in the app bundle.
  content: {
    filesystem: [
      'src/**/*.{ts,tsx}',
      'node_modules/@platform/ui/dist/**/*.js',
    ],
  },
});
