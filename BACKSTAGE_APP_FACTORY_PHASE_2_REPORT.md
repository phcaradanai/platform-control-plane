# Backstage App Factory - Phase 2 Report

## Scope

Upgraded the `platform-mfe-app` scaffolder skeleton from the Phase 1
minimal TypeScript-node placeholder into a production-ready React
frontend boilerplate (React 19 + Vite 8 + TypeScript strict, TanStack
Router/Query/Table/Virtual, React Hook Form + Zod, Radix UI primitives,
UnoCSS with semantic CSS variables, light/dark/system theming, typed API
boundary, environment validation, loading/empty/error/not-found states,
unit + browser smoke tests, and a green generated-repo CI). Everything
was verified end-to-end: the control plane itself, a hermetic render of
the skeleton, AND a real Backstage scaffolder run that created a GitHub
repository whose own Actions CI went green.

No capability composition, Module Federation runtime, Super App shell,
runtime registry, Keycloak/OpenFGA, or desktop/mobile shells were
implemented (all out of scope, per the prompt).

## What was changed and why

### Skeleton: placeholder -> real application

Phase 1's skeleton was a buildable TypeScript *node* placeholder
(`src/index.ts`, commonjs tsc, no runtime). It proved the App Factory
pipeline (fetch -> publish -> register) but gave generated applications
nothing real to build on. Phase 2 replaces it with a complete
single-page application foundation:

```
templates/platform-mfe-app/skeleton/
  package.json            React 19 / Vite 8 / strict TS, full script set
  index.html              templated <title>/<meta> from values.title/description
  tsconfig.json           strict, noUncheckedIndexedAccess, verbatimModuleSyntax,
                          @/* path alias, DOM libs
  tsconfig.node.json      for vite/uno/playwright configs
  vite.config.ts          react + tanstackRouter + unocss plugins, vitest inline
  uno.config.ts           presetWind3, semantic colors -> CSS variables
  eslint.config.mjs       flat config (typescript-eslint, react-hooks,
                          react-refresh) with library-file exemptions
  playwright.config.ts    builds then previews :4173 for e2e
  src/
    main.tsx              boot: font, reset, uno, theme.css, env validation, App
    app.tsx               ThemeProvider + QueryClientProvider + ToastProvider
                          + RouterProvider (+ devtools in dev)
    router.tsx            TanStack Router, scroll restoration
    routeTree.gen.ts      COMMITTED generated route tree (see decision below)
    routes/               __root (layout + not-found), index (home), table, form
    api/                  client.ts (typed fetch wrapper, timeout, ApiError),
                          health.ts, types.ts — the single network boundary
    lib/                  cn.ts, env.ts (zod env validation), app-info.ts
    components/ui/        Radix-based: button, input, label, card, badge,
                          spinner, skeleton, dialog, select, dropdown-menu,
                          checkbox, switch, tabs, tooltip, toast
    components/feedback/  loading-state, empty-state, error-state,
                          not-found-state, QueryBoundary (canonical states)
    components/theme/     ThemeProvider (light/dark/system), ThemeToggle
    components/layout/    AppShell, Header (skip link, aria-current nav),
                          Footer
    features/             health (live API demo), table-demo (TanStack Table
                          v8 + Virtual over 500 generated rows),
                          form-demo (RHF + zod 4 + Radix controls)
    styles/theme.css      semantic CSS variables (light :root / dark
                          [data-theme='dark']), focus rings, reduced-motion
    test/setup.ts         jsdom stubs (matchMedia, ResizeObserver, ...)
  e2e/smoke.spec.ts       Playwright: boot+title, theme toggle+persist, table
                          virtualization+sort, form validation+submit, 404
  .github/workflows/ci.yml  install declared npm -> verify npm --version ->
                          npm ci (frozen) -> lint -> typecheck -> test ->
                          build -> playwright -> e2e (with dependency cache;
                          see Final-fix section)
```

### Library versions (researched against npm registry before deciding)

| Library | Version | Notes |
| --- | --- | --- |
| react / react-dom | ^19.2.8 | current stable major |
| vite | ^8.2.1 | current major; engines node >=22.12 |
| @vitejs/plugin-react | ^6.0.5 | peer vite ^8 (other peers optional) |
| typescript | ~5.9.3 | NOT 7.x: typescript-eslint caps at <6.1.0; 5.9 is the proven line |
| @tanstack/react-router | ^1.170.21 | + router-plugin ^1.168.26 (vite peer ok) |
| @tanstack/react-query | ^5.101.4 | + devtools |
| @tanstack/react-table | ^8.21.3 | v9.0.0 exists but is brand-new; v8 is the proven, documented line |
| @tanstack/react-virtual | ^3.14.9 | |
| react-hook-form | ^7.84.0 | + @hookform/resolvers ^5.7.1 (zod ^4 supported) |
| zod | ^4.4.3 | current major; schema tests cover it |
| Radix primitives | dialog/dropdown/select/checkbox/label/slot/switch/tabs/toast/tooltip | all React 19-compatible |
| unocss | ^66.7.5 | + @unocss/reset (imported as tailwind.css entry — see pitfalls) |
| vitest | ^4.1.10 | jsdom ^30, testing-library react ^16.3.2 / user-event ^14.6.3 / jest-dom ^7.0.0 |
| @playwright/test | ^1.62.1 | browser smoke |
| eslint | ^10.8.0 | + typescript-eslint ^8.66.0, react-hooks ^7.1.1, react-refresh ^0.5.3 |
| lucide-react / clsx / @fontsource-variable/inter | ^1.29.0 / ^2.1.1 / ^5.3.0 | icons, cn(), font |

## Architecture decisions

1. **File-based TanStack Router with a committed generated route tree.**
   `@tanstack/router-plugin` (Vite) generates `src/routeTree.gen.ts` from
   `src/routes/**`. The generated file is **committed in the skeleton** so
   `npm run typecheck` (tsc --noEmit) passes in CI *before* `vite build`
   ever runs — otherwise a fresh checkout with no build history would fail
   typecheck on a missing module. The template-validation suite asserts the
   file exists and carries the generated marker.

2. **Semantic CSS variables as the single theming mechanism.** All UnoCSS
   theme colors resolve to CSS custom properties (`--color-*`) declared in
   `src/styles/theme.css` under `:root` (light) and
   `[data-theme='dark']` (dark). Components write theme-agnostic utilities
   (`bg-card text-foreground border-border`) with zero `dark:` variants;
   flipping `data-theme` on `<html>` reskins the app. ThemeProvider
   persists preference to localStorage, follows `prefers-color-scheme`
   live for the system option, and sets `color-scheme` so native widgets
   match. Contrast pairs meet WCAG AA in both themes.

3. **Radix primitives wrapped as local UI components** (`src/components/ui`).
   This is the shadcn-style convention: applications consume
   `Button`/`Dialog`/`Select`/etc. from their own tree, so swapping a
   primitive later (or adding app-wide variants) is a single-file change.
   All primitives keep forwardRef, accessible labels, and focus-visible
   rings.

4. **Single API boundary.** Every network call goes through
   `src/api/client.ts` — base URL from validated env, JSON handling,
   AbortController timeout, and normalized `ApiError` (status/code).
   Domain endpoints live in `src/api/`; components and query hooks never
   call `fetch` directly. `features/health` demonstrates the pattern
   against a real (usually absent) backend, which doubles as the error /
   retry-state demo.

5. **Canonical UI states via QueryBoundary.** `QueryBoundary` renders the
   loading / empty / error(+retry) / data states for any TanStack Query
   result, so feature code never hand-rolls conditional rendering. The
   404 case is a route-level `notFoundComponent` on the root route.

6. **Deterministic demo data.** The table demo generates 500 rows from a
   seeded, index-based formula (no RNG) so unit tests and Playwright
   assertions are stable across machines and runs.

7. **Form validation with zod 4.** `zodResolver` + `useForm` with a
   `noValidate` form; Radix Select/Switch are wired through `Controller`.
   Inline errors carry `role="alert"`, `aria-invalid`, and
   `aria-describedby`.

8. **CI without a lockfile (deliberate, superseded by Phase 2 Closure).**
   As originally written, the scaffolder does not run `npm install`, so no
   lockfile exists in generated repos; Phase 1.2 learned that
   `setup-node`'s `cache: npm` fails hard without one. The closure pass
   then added a committed, name-templated `package-lock.json` and switched
   generated CI to `corepack enable` + `npm ci` + `cache: npm` — see the
   Phase 2 Closure section at the end of this report.

9. **e2e specs are templated too.** `e2e/smoke.spec.ts` lives outside
   `.github/workflows/**`, so it IS nunjucks-rendered — the title assertion
   uses `${{ values.title }}` and therefore verifies the whole render
   chain (scaffold -> repo -> built app -> browser), not a hardcoded
   string. Verified: the generated repo's spec contains the real title.

10. **Library-file lint exemptions.** `react-refresh/only-export-components`
    is disabled for `src/routes/**` (routes export a `Route` constant by
    design) and `src/components/ui/**` + theme-provider (Radix re-export /
    hook-pairing modules). `react-hooks/incompatible-library` is disabled
    for `src/features/table-demo/**` because `useReactTable` is a
    documented false positive for that rule. Result: **0 lint errors, 0
    warnings** on the rendered app.

## Pitfalls found and fixed during verification

- **`@unocss/reset` bare import fails under Vite 8 / rolldown.** The
  package's exports map exposes `./*` entries only; `import
  '@unocss/reset'` resolves to nothing. Fixed with the explicit CSS entry
  `@unocss/reset/tailwind.css`. (Found by the real build, not by docs.)
- **zod 4 `.default()` on a boolean made RHF input/output types diverge**,
  breaking `handleSubmit` typing. Removed the `.default()` (the default
  lives in `useForm`'s `defaultValues` where it belongs).
- **Playwright strict-mode collisions.** `getByLabel('Email')` matched
  both the email input and the "Email notifications" switch;
  `getByText('Choose a role')` matched the Select placeholder AND the
  error. Fixed with role-scoped selectors (`getByRole('textbox', {name})`,
  `getByRole('alert').filter(...)`).
- **Radix Select needed an accessible name.** The plain `<Label>Role</Label>`
  wasn't associated with the trigger; added `id="role"` + `htmlFor`.
- **Virtualized tables render a viewport-full of rows.** The initial e2e
  assertion `toHaveCount(6)` was wrong; virtualization renders ~23 rows.
  Asserted `count > 5` + first/last row visibility instead.
- **`routeTree.gen.ts` is stable.** Rebuilds after every fix produced a
  byte-identical file; the committed copy matches the generated one.

## Verification performed (all real, all passing)

### 1. Control plane (`platform-control-plane`)

```
node .yarn/releases/yarn-4.13.0.cjs tsc          # PASS (exit 0)
node .yarn/releases/yarn-4.13.0.cjs lint:all     # PASS (app, backend, template-validation)
node .yarn/releases/yarn-4.13.0.cjs test:all     # PASS - 6 suites, 52 tests
node .yarn/releases/yarn-4.13.0.cjs build:all    # PASS (dist for app + backend)
docker compose config --quiet                    # (unchanged, valid)
```

`packages/template-validation` gained 5 new assertions (boilerplate
foundation files, committed route tree, package scripts/engines, index.html
templating, .env.example) — 51 tests in that package, all green.

### 2. Hermetic render + real app install/build/test

The skeleton was rendered with the same nunjucks config Backstage's
`fetch:template` uses (`${{ }}`, `{ values }`, workflows copied verbatim)
into a temp dir, then the **real generated app** was exercised:

- `npm install` — 402 packages, clean
- `npm run lint` — 0 errors, 0 warnings
- `npm run typecheck` — clean
- `npm test` — 5 files, 19 tests, all pass (cn, env, QueryBoundary states,
  ThemeProvider, form schema)
- `npm run build` — vite production build succeeds; routeTree.gen.ts
  regenerates byte-identically
- `npm run test:e2e` (Playwright chromium) — **5/5 pass**: boot+title,
  theme toggle+persist, table virtualization+sort, form validation+submit,
  404 page
- No literal `${{` remains in any rendered file outside `.github/workflows/`

### 3. Real Backstage scaffolder E2E (the main gate)

PostgreSQL-backed backend (docker compose + `app-config.local.yaml`,
`GITHUB_TOKEN` sourced from `gh auth token`, never written to disk),
guest-token auth, task submitted via `POST /api/scaffolder/v2/tasks`:

- **Task `c1a087ad-8dd6-497b-bd23-81842eb061de` → `completed`** on the
  first poll. Event log shows all 3 steps (`fetchBase` processing 86
  files, `publish`, `register`) succeeding.
- **Repo created**: `phcaradanai/platform-phase2-boilerplate-test`
  (private, default branch `main`).
- **Rendered output verified against the real repo** (not just hermetic):
  - `platform-app.json` exactly matches the submitted values (id, title,
    mode `platform-mfe`, owner `group:default/platform-team`,
    capabilities `[authentication, rbac, dashboard, theme, i18n,
    observability]`, runtime `not-configured`).
  - `index.html` carries the real title and description.
  - `e2e/smoke.spec.ts` contains the real title — templating worked.
  - No `${{` left anywhere outside `.github/workflows/`.
  - `.github/workflows/ci.yml` **byte-identical** to the skeleton source
    (copyWithoutTemplating verified against the real action handler).
  - `catalog-info.yaml` registered with correct owner/lifecycle/slug.
- **Catalog registration**: entity present, then unregistered
  (location delete 204, re-query 404) so the platform catalog stays clean.

### 4. Generated repo's own GitHub Actions CI — GREEN

The generated repo's first push triggered its own workflow
(https://github.com/phcaradanai/platform-phase2-boilerplate-test/actions/runs/31160463908):

```
✓ Run npm install                  ✓ Run npm run lint
✓ Run npm run typecheck            ✓ Run npm test
✓ Run npm run build                ✓ Run npx playwright install --with-deps chromium
✓ Run npm run test:e2e             (5 passed)
✓ Complete job — 2m3s, success
```

This closes the loop the prompt asked for: a freshly generated
application through the REAL scaffolder passes its actual CI — install,
lint, typecheck, tests, build, and browser smoke — on real GitHub
Actions, not just locally.

## Files created or changed

```
MOD  .gitignore                                  (+ .hermes/ local agent state)
MOD  packages/template-validation/src/template.test.ts  (+5 boilerplate assertions)
MOD  templates/platform-mfe-app/skeleton/*       (see structure above)
NEW  templates/platform-mfe-app/skeleton/{index.html, vite.config.ts,
     uno.config.ts, tsconfig.node.json, eslint.config.mjs,
     playwright.config.ts, e2e/**, src/**}       (the full boilerplate)
DEL  templates/platform-mfe-app/skeleton/src/index.ts  (Phase 1 placeholder)
```

`template.yaml` (parameters, steps, capability enum, `copyWithoutTemplating`)
is **unchanged** — the App Factory flow, form schema, and catalog
registration are preserved exactly.

## Remaining limitations

- **No runtime backend is generated.** The API boundary and health demo
  are patterns; a generated app still needs its own server. Intended —
  Phase 2 is the frontend foundation only.
- **`/v2/dry-run` remains blocked on this Windows host** (Phase 1
  finding: drive-letter path defect in the endpoint itself). The real
  task-execution path (proven here) and hermetic render tests substitute
  for it, as in Phase 1.
- **`platform-phase2-boilerplate-test` repo left in place as evidence**,
  same convention as Phase 1's smoke repos (token lacks `delete_repo`
  scope). Delete manually with `gh repo delete
  phcaradanai/platform-phase2-boilerplate-test` if desired.
- **jsdom engine warning** (`^22.22.2` vs local node 22.20.0) is
  warning-only; CI's setup-node installs the latest 22.x so it does not
  affect generated repos.
- **Capabilities remain metadata-only** (unchanged from Phase 1) — no
  capability is installed or wired into the app.
- **No i18n runtime** — the boilerplate is English-only by design;
  `i18n` remains a requested-but-unimplemented capability.

## Readiness for the next phase

The foundation is now real: every generated application ships a working,
tested, themeable React app with a strict typecheck, zero-lint baseline,
unit + browser coverage, and a CI that provably runs green on the first
push. Phase 3 (Nx capability composition, Module Federation runtime, Super
App shell) can now treat the generated app as a stable base rather than a
placeholder — `platform-app.json`'s `capabilities`/`runtime` fields exist
precisely to drive that work, and the committed route tree / API boundary
give the runtime clear seams to attach to. Recommended next-step order
(from Phase 1's list): GitHub App integration for token hygiene, a real
permission policy, real group data, then the composition/runtime work.

## Phase 2 Closure: Dependency Reproducibility & Request Cancellation

Two foundation-level risks were closed before merge, plus a real template
defect the fresh scaffolder run surfaced.

### 1. Reproducible generated applications

**Root cause.** The skeleton shipped `package.json` (caret ranges) but no
lockfile — the scaffolder's `fetch:template` → `publish:github` flow never
runs `npm install`, so every generated repo resolved dependencies from
floating ranges on first CI run. Phase 1.2 had disabled `cache: npm`
precisely because there was no lockfile to key on, which papered over the
symptom (cache failure) while the root issue (non-reproducible resolution)
remained.

**Chosen solution.**
- A `package-lock.json` (lockfileVersion 3) is **committed in the
  skeleton**, with its two name fields (`name` + `packages[""].name`)
  templated as `${{ values.name }}` so the rendered lockfile matches the
  rendered package.json exactly. Generated by a real install, byte-exact
  copy via script (no re-serialization).
- `package.json` gains `"packageManager": "npm@10.9.3"` — explicit package
  manager + version.
- Generated CI now runs the pinned npm (initially `corepack enable`, later
  replaced by an explicit global install + version assertion — see the
  Final-fix section) then **`npm ci`** (frozen: fails if package.json and
  the lockfile drift, installs exactly the locked tree), and re-enables
  **`cache: npm`** — safe now that the lockfile exists, so cache keys never
  mismatch the installed tree.
- `.npmrc` with `legacy-peer-deps=true` + `fund=false`/`audit=false`.

**Why `legacy-peer-deps`.** `npm ci` rejected the hoisted tree: eslint@10
depends on `ajv@^6.14.0` while `@hookform/resolvers@5.7.1` declares ~24
optional peers (ajv@^8, joi, yup, …) for resolvers the app never uses.
`npm install` tolerates this; `npm ci`'s strict sync validation does not.
`legacy-peer-deps` skips peer auto-resolution and installs exactly the
locked tree — deterministic, and it surfaced one more required dep:
`@testing-library/dom` (peer of RTL/jest-dom/user-event) is now declared
explicitly. Result: 403 packages locked, `npm ci` green from clean.

### 2. Request cancellation

**Root cause.** `request()` owned an internal AbortController for its
timeout but never accepted an external signal, so TanStack Query's
`queryFn({ signal })` cancellation (unmount, refetch, queryClient.cancel)
could never reach `fetch` — cancelled queries kept burning network
requests until timeout.

**Chosen solution (minimal, no rewrite).** `request()` now accepts
`options.signal`; an external abort forwards to the internal controller
(one controller, first abort wins). On catch, an aborted external signal
rethrows `DOMException('The operation was aborted.', 'AbortError')` — the
convention TanStack Query recognizes as a **cancellation**, not a query
error — while the internal timeout still maps to `ApiError` code
`TIMEOUT`. `getHealth(signal?)` and the health `queryFn: ({ signal }) =>
getHealth(signal)` wire it through. New `src/api/client.test.ts` covers
success, HTTP error, timeout, external abort, and network failure (5
tests).

### 3. Template defect found by the fresh scaffolder run

The closure E2E with a description containing `": "`
(`...closure verification: lockfile...`) **failed at `catalog:register`**:
the skeleton rendered `description:` unquoted into `catalog-info.yaml`, so
YAML parsed `verification: lockfile...` as a nested compact mapping →
`YAMLParseError` → 400. Phase 2's earlier run only passed because its
description had no colon. Fixed by JSON-quoting (`| dump`, the same
pattern already used for capabilities) both `title` and `description` in
the skeleton's `catalog-info.yaml`, with a hostile-input regression test
(colons, double quotes, newlines).

### Verification (Phase 2 Closure)

Control plane (all green):
```
yarn tsc            # exit 0
yarn lint:all       # clean (app, backend, template-validation)
yarn test:all       # 6 suites, 55 tests
yarn build:all      # dist for app + backend
```
Template validation: **55 tests** (5 new: lockfile+packageManager,
frozen-CI assertions, rendered lockfile name, hostile catalog-info).

Hermetic render → temp app, **from clean with `npm ci`**:
`npm ci` (403 pkgs) → lint 0/0 → typecheck clean → 24/24 tests (incl. 5
new client tests) → build → **5/5 Playwright e2e**.

**Fresh real scaffolder run** (task `ca84b3f4-64fd-4a1a-b92e-3b67c355d17f`,
PostgreSQL backend, `GITHUB_TOKEN` from `gh auth token`) → **completed**
(fetchBase → publish → register, hostile description included). Generated
repo `phcaradanai/platform-phase2-closure-verify` verified to contain:
- `package-lock.json` with the **real** app name in both name fields,
  lockfileVersion 3
- `packageManager: npm@10.9.3`, `.npmrc` (legacy-peer-deps + quiet flags)
- JSON-quoted `catalog-info.yaml` description/title
- cancellation wiring (`externalSignal`/`AbortError` in client.ts,
  `queryFn: ({ signal })` in health hook, client.test.ts present)

**Generated repo CI passed from a clean checkout**:
https://github.com/phcaradanai/platform-phase2-closure-verify/actions/runs/31164553985
— `corepack enable` ✓ `npm ci` ✓ lint ✓ typecheck ✓ test ✓ build ✓
playwright install ✓ e2e ✓ — **1m12s** (vs 2m03s pre-closure: the frozen
install + dependency cache also made CI faster).

Two disposable repos remain as evidence (`platform-phase2-closure-test`,
`platform-phase2-closure-verify`; token lacks `delete_repo` scope) —
delete manually if desired. Catalog entries were unregistered after
verification (both 404 on re-query).

### Remaining blockers

None. Both foundation risks are closed with focused tests, and the
template defect found by the closure run is fixed and regression-tested.
The only outstanding items are the same documented limitations as Phase 2
(no runtime backend generated, Windows dry-run quirk, capability metadata
only) plus the disposable evidence repos.

## Final fix: CI uses the exact declared npm version (proven, not assumed)

The closure's CI used `corepack enable` to select the npm declared in
`packageManager`, but nothing *proved* the active npm was the declared
one. A real generated-repo run exposed the gap: the runner executed
`corepack enable` yet `npm --version` reported the Node-bundled
**npm@10.9.8**, not the declared **npm@10.9.3** — corepack's shim does
not reliably win PATH on GitHub Actions runners.

**Fix (smallest safe change, no architecture impact):** the generated
workflow now (1) **installs** the declared npm globally
(`npm install -g "npm@$(node -p "…packageManager")"` — the classic,
deterministic override that wins PATH), then (2) **asserts**
`npm --version` equals the declared `packageManager` and fails fast with
a clear `::error::` message on mismatch, *before* `npm ci`. Lockfile,
frozen install, tests, scaffolder behavior, and architecture are
unchanged. Template-validation asserts both steps are present and that
project dependencies still install via `npm ci` (never a bare floating
`npm install` step).

**Verification (real GitHub Actions runs, not simulated):**

1. **Negative control** — the assertion-first version (corepack only)
   failed on a real generated repo exactly as designed: `Declared
   packageManager: npm@10.9.3` vs `Active npm: npm@10.9.8`, job aborted
   at the verify step in 6s. This proves the guard catches the
   Node-bundled fallback.
2. **Fixed workflow, fresh scaffolder run** — task
   `b7864f09-1279-4ef1-89c7-1a0ccebaa63b` completed; generated repo
   `phcaradanai/platform-phase2-npmverify2` carries the workflow
   byte-identical to the skeleton. Its GitHub Actions CI
   (https://github.com/phcaradanai/platform-phase2-npmverify2/actions/runs/31166285692)
   **succeeded (1m13s)**, with the step log showing:
   `Declared packageManager: npm@10.9.3` / `Active npm: npm@10.9.3` —
   i.e. CI provably ran the exact declared npm, then `npm ci` →
   lint → typecheck → test → build → playwright → e2e all green.
3. **Control plane** — PR #2 `verify` job passed on the fix commit
   (https://github.com/phcaradanai/platform-control-plane/actions/runs/31166262779,
   2m19s); locally tsc / lint / test (56) / build all green; template
   validation 55 tests including the updated CI assertions.

Three disposable npm-verification repos remain as evidence
(`platform-phase2-npmverify`, `platform-phase2-npmverify2`, and the
earlier closure repos); catalog entries were unregistered after each run
(404 on re-query).

## Phase 2 Runtime Closure

The Phase 1–2 foundation is now reliable from a fresh developer start, and
the local/manual runtime flow (`start → guest → catalog → create`) is
proven end-to-end in CI, not just manually.

### What was fixed

1. **Local startup made one-word and documented at the root.**
   Root `package.json` gains `dev:backend` and `dev:app` scripts (the
   two-process Windows workflow via the vendored Yarn), so the supported
   startup is now `yarn dev:backend` + `yarn dev:app`. The root `README.md`
   was rewritten from the stock Backstage boilerplate to document the real
   workflow: prerequisites, install, two-process start, readiness endpoint,
   verification, tests, and docs pointers. `docs/getting-started.md` updated
   to reference the scripts, the readiness endpoint, and the self-starting
   smoke tests.

2. **Frontend readiness handling.** New `backend-status` app-root module
   (`packages/app/src/modules/backend-status/`): an `AppRootElementBlueprint`
   extension that polls the backend's built-in readiness endpoint
   (`GET {backend.baseUrl}/.backstage/health/v1/readiness` — returns `503`
   until startup completes, then `200`) every 15s and renders a full-width
   "Backend unavailable — Catalog and Create require the backend API" banner
   while the APIs are unreachable. The frontend is therefore never presented
   as healthy while the required APIs are down. Uses plain `fetch` (the
   endpoint is unauthenticated; Backstage's FetchApi adds identity/discovery
   machinery that hangs before sign-in). Unit tests cover unavailable /
   503 / healthy; an integration test renders the whole app with a broken
   fetch and asserts the banner appears. Live-verified in a real browser
   both ways: banner appears with backend down, clears on recovery.

3. **Catalog/Create smoke tests now part of CI.** New `e2e` job in
   `.github/workflows/ci.yml`: installs deps, installs Playwright browsers,
   and runs `catalog.test.ts` + `create.test.ts` with `GITHUB_TOKEN` from
   `secrets.GITHUB_TOKEN` (the create form's repo-availability validation
   needs the GitHub integration configured). The Playwright `webServer`
   config now starts the backend and frontend itself in both CI and local
   (the same documented two-process commands), gating on the backend
   readiness endpoint (which returns 503 until up, so the tests never race
   a half-started backend) with generous cold-compile timeouts. Root script
   `test:e2e:smoke` runs just the smoke tests locally.

### Verification (Runtime Closure)

- Control plane: `tsc` 0, `lint:all` clean, `test:all` **8 suites / 60
  tests** (incl. 4 new banner tests), `build:all` green.
- Playwright smoke tests (`catalog` + `create`), Playwright starting both
  servers from clean: **3 passed in ~37s** locally, then again in CI.
- Live browser check (frontend up, backend down): red "Backend
  unavailable" banner rendered at the top of the app; after starting the
  backend and the readiness endpoint returned 200, the banner cleared.
  Backend logs confirm the banner's readiness polls
  (`GET /.backstage/health/v1/readiness` from the frontend origin).
- Generated apps and the scaffolder contract are untouched (no changes to
  `templates/` or `packages/template-validation`).

### Remaining blockers

None for the runtime closure. The same Phase 2 documented limitations
remain (no production deployment, Module Federation/Nx composition, or
auth/RBAC — later phases), plus: `yarn start` (combined orchestrator)
remains unreliable on Windows and the documented path is the two-process
workflow; the e2e job needs `GITHUB_TOKEN` (the repo's default secret is
used) and takes ~2–3 min for the cold dev-mode backend compile.

## Phase 2: PASS

## Recommendation: READY FOR NEXT PHASE
