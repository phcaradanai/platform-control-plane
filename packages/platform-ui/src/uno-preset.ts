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
 * Each token is wrapped as `rgb(var(--color-x) / <alpha-value>)` rather
 * than a bare `var(--color-x)`. `theme.css` stores the channels as
 * space-separated numbers ("R G B"), and UnoCSS substitutes
 * `<alpha-value>` with the opacity modifier (`bg-primary/10` -> `0.1`).
 * A bare `var()` reference can't be alpha-sliced this way - opacity
 * modifiers on it silently collapse to full opacity - which is exactly
 * the failure this wrapping form exists to prevent. Keep this pairing
 * (channels-only var in `theme.css` + `rgb(var(...) / <alpha-value>)`
 * here) for every future token; do not reintroduce hex or bare `var()`
 * values in either file.
 *
 * Consumers spread this into their own `defineConfig`:
 *
 * ```ts
 * import { platformUnoTheme, platformUnoShortcuts, platformUnoPreflights, platformUnoContent } from '@platform/ui/uno-preset';
 * import { defineConfig, presetWind3 } from 'unocss';
 *
 * export default defineConfig({
 *   presets: [presetWind3()],
 *   theme: platformUnoTheme,
 *   shortcuts: platformUnoShortcuts,
 *   preflights: platformUnoPreflights,
 *   content: platformUnoContent(),
 * });
 * ```
 */
export const platformUnoTheme = {
  colors: {
    background: 'rgb(var(--color-background) / <alpha-value>)',
    foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
    border: 'rgb(var(--color-border) / <alpha-value>)',
    ring: 'rgb(var(--color-ring) / <alpha-value>)',
    card: {
      DEFAULT: 'rgb(var(--color-card) / <alpha-value>)',
      foreground: 'rgb(var(--color-card-foreground) / <alpha-value>)',
    },
    primary: {
      DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
      foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
    },
    secondary: {
      DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
      foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
    },
    muted: {
      DEFAULT: 'rgb(var(--color-muted) / <alpha-value>)',
      foreground: 'rgb(var(--color-muted-foreground) / <alpha-value>)',
    },
    accent: {
      DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
      foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
    },
    destructive: {
      DEFAULT: 'rgb(var(--color-destructive) / <alpha-value>)',
      foreground: 'rgb(var(--color-destructive-foreground) / <alpha-value>)',
    },
    success: {
      DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
      foreground: 'rgb(var(--color-success-foreground) / <alpha-value>)',
    },
    warning: {
      DEFAULT: 'rgb(var(--color-warning) / <alpha-value>)',
      foreground: 'rgb(var(--color-warning-foreground) / <alpha-value>)',
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
        background-color: rgb(var(--color-background));
        color: rgb(var(--color-foreground));
        font-family: var(--font-sans);
      }
    `,
  },
];

/**
 * Content-extraction config for consumers of this package.
 *
 * `@platform/ui`'s compiled output is plain `.js` (not `.jsx`/`.tsx`), but
 * `@unocss/vite`'s pipeline transform runs every filesystem-matched file
 * through `createFilter(pipeline.include ?? defaultPipelineInclude, ...)`,
 * and the default include regex
 * (`/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|marko|html)($|\?)/`) has
 * no bare `.js`. Without this override, `content.filesystem` matching the
 * vendored package is silently dropped by that filter and none of its
 * utility classes are ever extracted - discovered via Dialog centering
 * (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`) never generating
 * any CSS during the Workspace Hub SaaS Foundation Validation exercise.
 *
 * This lives here (not copy-pasted into each app's `uno.config.ts`) so
 * every generated application gets it from the package itself and the fix
 * survives regenerating or hand-editing an app's UnoCSS config.
 *
 * `vendorDistGlob` defaults to the path this package is vendored at by the
 * `platform-mfe-app` template (`node_modules/@platform/ui/dist/**\/*.js`);
 * override it only if a consumer's install layout differs.
 */
export function platformUnoContent(
  vendorDistGlob = 'node_modules/@platform/ui/dist/**/*.js',
): NonNullable<UserConfig['content']> {
  return {
    filesystem: ['src/**/*.{ts,tsx}', vendorDistGlob],
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|vine\.ts|mdx?|astro|elm|php|phtml|marko|html)($|\?)/,
        vendorDistGlob,
      ],
    },
  };
}
