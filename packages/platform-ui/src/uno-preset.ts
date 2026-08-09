import type { UserConfig } from 'unocss';

/**
 * Shared UnoCSS theme, shortcuts, and preflights for Platform MFE
 * applications.
 *
 * Every colour resolves to a CSS custom property declared in
 * `theme.css` (light under `:root`, dark under `[data-theme='dark']`).
 * That indirection is what makes utilities such as `bg-background
 * text-foreground border-border` theme-aware without any `dark:` variants
 * in component code.
 *
 * Consumers spread this into their own `defineConfig`:
 *
 * ```ts
 * import { platformUnoTheme, platformUnoShortcuts, platformUnoPreflights } from '@platform/ui/uno-preset';
 * import { defineConfig, presetWind3 } from 'unocss';
 *
 * export default defineConfig({
 *   presets: [presetWind3()],
 *   theme: platformUnoTheme,
 *   shortcuts: platformUnoShortcuts,
 *   preflights: platformUnoPreflights,
 * });
 * ```
 */
export const platformUnoTheme = {
  colors: {
    background: 'var(--color-background)',
    foreground: 'var(--color-foreground)',
    border: 'var(--color-border)',
    ring: 'var(--color-ring)',
    card: {
      DEFAULT: 'var(--color-card)',
      foreground: 'var(--color-card-foreground)',
    },
    primary: {
      DEFAULT: 'var(--color-primary)',
      foreground: 'var(--color-primary-foreground)',
    },
    secondary: {
      DEFAULT: 'var(--color-secondary)',
      foreground: 'var(--color-secondary-foreground)',
    },
    muted: {
      DEFAULT: 'var(--color-muted)',
      foreground: 'var(--color-muted-foreground)',
    },
    accent: {
      DEFAULT: 'var(--color-accent)',
      foreground: 'var(--color-accent-foreground)',
    },
    destructive: {
      DEFAULT: 'var(--color-destructive)',
      foreground: 'var(--color-destructive-foreground)',
    },
    success: {
      DEFAULT: 'var(--color-success)',
      foreground: 'var(--color-success-foreground)',
    },
    warning: {
      DEFAULT: 'var(--color-warning)',
      foreground: 'var(--color-warning-foreground)',
    },
  },
  fontFamily: {
    sans: 'var(--font-sans)',
  },
} as const;

export const platformUnoShortcuts: Record<string, string> = {
  btn: 'inline-flex items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  card: 'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
  input:
    'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  label: 'text-sm font-medium leading-none text-foreground',
};

export const platformUnoPreflights: UserConfig['preflights'] = [
  {
    getCSS: () => `
      body {
        background-color: var(--color-background);
        color: var(--color-foreground);
        font-family: var(--font-sans);
      }
    `,
  },
];
