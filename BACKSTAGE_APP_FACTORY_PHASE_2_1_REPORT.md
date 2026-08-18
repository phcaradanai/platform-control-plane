# Backstage App Factory — Phase 2.1 Report

> **Historical phase report — see current documentation.** This report
> preserves Phase 2.1 decisions and evidence; it is not the current capability
> contract. Read [Current platform status](docs/status.md), [Feature Pack guide](docs/capabilities.md),
> and [Frontend feature packs](docs/feature-packs.md).

## Shared Platform UI & Design Tokens

Repository: `phcaradanai/platform-control-plane`
Branch: `feat/backstage-app-factory-phase-2-1`
Date: 2026-08-07

## Goal

Establish a reusable Platform UI + Design Token foundation so generated
applications share one visual language, component behavior, accessibility
standard, theme, and motion standard — instead of each generated app
independently copying and diverging from the boilerplate.

## Architectural decision: `@platform/ui` workspace package, consumed as a vendored tarball

The shared boundary is a new Yarn workspace package `packages/platform-ui`
(`@platform/ui`), holding the proven Phase 2 primitives and the semantic
design tokens. Generated apps consume it as a **vendored tarball**
(`file:./vendor/platform-ui-0.1.0.tgz`) committed inside the skeleton.

Why this shape (and not alternatives):

- **No registry dependency.** There is no npm publish token in this
  environment (no `~/.npmrc`, the `gh` token lacks `write:packages`), so
  publishing to npmjs/GitHub Packages would add auth + a publish pipeline
  — more machinery than the prompt's "smallest architecture that can
  genuinely be shared and versioned".
- **Versioned and reproducible.** The tarball name carries the version
  (`platform-ui-0.1.0.tgz`) and the package.json pins it exactly; the
  committed `package-lock.json` records its integrity hash, so `npm ci` on
  a fresh runner installs bit-identical content — offline, no network
  round-trip to a registry.
- **Generated apps stay standalone.** A generated repo is fully
  self-contained (skeleton + tarball + lockfile); it does not need the
  control plane or any network beyond npm itself.
- **Single source of truth.** The primitives live in the control-plane
  monorepo, are unit-tested there, and are versioned through the tarball.
  Upgrading the shared foundation = bump version → rebuild → re-vendor →
  new template commit. Generated apps never edit the shared code.

Boundary rule enforced by tests: the skeleton must NOT re-implement
`components/ui/*`, `components/theme/*`, `components/feedback/*`,
`lib/cn`, or `styles/theme.css` (they live in the package); the app keeps
its layout, features, routes, and app-info. Product-specific styles
cannot silently become platform standards.

## What was built

1. **`packages/platform-ui`** — a plain ESM TypeScript library (not a
   Backstage plugin) that builds with `tsc` (NodeNext, `.js` extensions in
   relative imports so the emitted ESM resolves under Node, Vitest, and
   Vite) and ships `dist/` + `theme.css` + type declarations via npm
   `files: ["dist"]`. Contents:
   - `src/styles/theme.css` — the semantic tokens (light `:root`, dark
     `[data-theme='dark']`, WCAG-AA contrast, reduced-motion friendly),
     now consumed via `@platform/ui/theme.css`.
   - `src/uno-preset.ts` — `platformUnoTheme` / `platformUnoShortcuts` /
     `platformUnoPreflights`, the shared UnoCSS mapping so every generated
     app resolves `bg-primary`, `text-muted-foreground`, `btn`, `card`,
     `input`, `label` to the same tokens.
   - `src/lib/cn.ts` (clsx), `src/components/theme/*` (ThemeProvider,
     ThemeToggle), `src/components/feedback/*` (Loading/Error/Empty/
     NotFoundState + QueryBoundary), `src/components/ui/*` (13 Radix
     primitives: badge, button, card, checkbox, dialog, dropdown-menu,
     input, label, select, skeleton, spinner, switch, tabs, toast,
     tooltip).
   - `NotFoundState` was made router-agnostic (takes an optional `action`
     ReactNode) so the package never depends on a routing library.
   - `eslint.config` / `.eslintrc.cjs` (Backstage factory), `lint` and
     `typecheck` scripts. Pinned to the repo's eslint 8.57 line to avoid a
     second hoisted eslint breaking `backstage-cli repo lint`.
2. **Skeleton refactor** — the generated app now imports everything from
   `@platform/ui`; `src/styles/theme.css`, `lib/cn.ts`, and the moved
   component directories were deleted from the skeleton. The skeleton's
   `uno.config.ts` spreads the shared theme/shortcuts/preflights and adds
   `content.filesystem: ['node_modules/@platform/ui/dist/**/*.js']` so
   UnoCSS generates utilities used inside the package (verified: the
   built app CSS contains `bg-primary`, `text-muted-foreground`, etc.).
   `main.tsx` imports `@platform/ui/theme.css` explicitly.
3. **Vendored tarball + lockfile** — `packages/platform-ui` packs to
   `platform-ui-0.1.0.tgz` (~20 KB), copied to
   `templates/platform-mfe-app/skeleton/vendor/`. The skeleton
   `package.json` pins `"@platform/ui": "file:./vendor/platform-ui-0.1.0.tgz"`
   and `package-lock.json` records its integrity hash. The renderers
   (`.hermes/render-skeleton.cjs` + `renderSkeleton.ts`) were updated to
   copy `vendor/**` byte-exactly (binary-safe) and `template.yaml` adds
   `vendor/**` to `copyWithoutTemplating` so nunjucks never touches the
   tarball.
4. **Component catalog** — new `src/routes/components.tsx` route in the
   skeleton: a visual verification page rendering every platform primitive
   (buttons, badges, cards, inputs, selects, tabs, dialog, dropdown,
   tooltip, skeleton, spinner, toast) with light/dark theming; linked from
   the app header. This is the "component catalog / visual verification
   path".
5. **Template validation** — 6 new assertions (61 total): vendor tarball
   exists + is gzip, `copyWithoutTemplating` includes `vendor/**`,
   `@platform/ui` dep is a `file:./vendor/...` pin (package.json +
   lockfile), moved files are absent from the skeleton, catalog route
   exists, uno.config consumes the shared preset, main.tsx imports the
   package stylesheet.

## Verification

### Control plane

- `tsc` 0 errors; `lint:all` clean (backstage repo lint incl.
  `@platform/ui` via its package lint script); `test:all` **8 suites / 66
  tests** (61 template-validation + app/backend); `build:all` green.
- `packages/platform-ui`: `build` (tsc + css copy) green, `lint` green,
  `typecheck` green, `npm pack` produces a valid ~20 KB tarball.

### Hermetic render (fresh, frozen install)

Render skeleton → `npm ci` (frozen, integrity-verified) → typecheck 0 →
lint 0 → 6/6 unit suites (24 tests) → `vite build` green → 5/5 Playwright
e2e (incl. catalog smoke) → no `${{` outside `.github/workflows/` +
`vendor/`. Repeated across renders; a pre-existing flake in the form e2e
(strict-mode `getByText('Form submitted')` matching the toast too) was
fixed with `{ exact: true }` — now 4/4 clean runs.

### Real scaffolder E2E

- Task `a18710f1-46a0-4d3c-b896-c6f061c7186a` → repo
  `phcaradanai/platform-p21-shared-ui2` (private) completed in ~2 polls;
  event log shows 66 files processed incl. `vendor/` copied verbatim.
- Generated repo verified independently: tarball **byte-identical** to the
  skeleton source, `package-lock.json` integrity hash matches the tarball,
  `@platform/ui` dep pinned, `platform-app.json`/catalog-info render
  correctly, no stray `${{`.
- **First attempt (`platform-p21-shared-ui`) exposed a real bug**: the
  vendored lockfile still carried the PREVIOUS tarball's integrity hash
  after the label/a11y fix rebuilt the tarball — `npm ci` on the runner
  failed with `EINTEGRITY` (`wanted upndJr76... but got r1JltQY0sh...`).
  Root cause: `npm install` does not re-hash an existing `file:` dep, so
  the lockfile must be regenerated from scratch whenever the tarball
  changes. Fixed by deleting the lockfile, reinstalling, verifying the
  hash matches, re-vendoring — and the second run's repo has matching
  hashes. The failed repo is kept as evidence (gh token lacks
  `delete_repo` scope).
- Generated repo CI: `npm ci` → lint → typecheck → test → build →
  playwright → e2e — **green** (see CI run on
  `platform-p21-shared-ui2`).

## Scope notes

- No Platform SDK, Module Federation, Super App runtime, auth/RBAC,
  CodeScape, or desktop/mobile — out of scope as instructed.
- Extension point for future brand/tenant theming: tokens are CSS custom
  properties scoped under `:root` / `[data-theme]`, so a tenant theme can
  override the variable set without touching components. No tenant logic
  implemented.
- The control-plane Backstage app itself still uses Backstage's MUI
  design system — this phase only governs the **generated** Platform MFE
  apps.

## Blockers

None.

Phase 2.1: PASS
Recommendation: READY FOR REVIEW
