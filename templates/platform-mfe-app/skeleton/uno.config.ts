import {
  platformUnoContent,
  platformUnoPreflights,
  platformUnoShortcuts,
  platformUnoTheme,
} from '@platform/ui/uno-preset';
import { defineConfig, presetWind3 } from 'unocss';

/**
 * UnoCSS config for a Platform MFE application. The theme, shortcuts,
 * preflights, and content-extraction rules come from the shared
 * @platform/ui package so every generated app uses the same semantic
 * tokens, component styling, motion standards, and (critically)
 * correctly extracts utility classes used inside the vendored package
 * itself - see `platformUnoContent`'s own doc comment in
 * `@platform/ui/uno-preset` for why that last part needs a package-owned
 * fix rather than a per-app one. Product-specific additions (extra
 * colors, fonts, shortcuts, extra content globs) belong here, not in the
 * shared package.
 */
export default defineConfig({
  presets: [presetWind3()],
  theme: platformUnoTheme,
  shortcuts: platformUnoShortcuts,
  preflights: platformUnoPreflights,
  content: platformUnoContent(),
});
