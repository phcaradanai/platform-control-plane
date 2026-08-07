# Backstage App Factory - Phase 1 Report

## Scope

Established the Backstage control plane for the App Factory: a standalone
Backstage app (`platform-control-plane`), PostgreSQL via Docker Compose,
GitHub integration, an initial catalog model (Domain/System/Component),
and a **Platform MFE Application** software template that scaffolds a
GitHub repository and registers it in the catalog. No runtime (Module
Federation, Nx composition, Super App shell, Keycloak, deployment) was
implemented, per the prompt's "Out of Scope" section.

## Architecture implemented

- **Backstage app**: bootstrapped with `npx @backstage/create-app@latest`
  into `platform-control-plane/`, generated architecture preserved
  (frontend `packages/app`, backend `packages/backend`, both on the new
  Backstage frontend/backend systems with the stock `examples/` catalog
  data left in place).
- **Database**: `docker-compose.yml` runs `postgres:16-alpine` with a
  healthcheck and named volume. `app-config.production.yaml` (and an
  opt-in `app-config.local.yaml`, gitignored) point the `pg` client at
  `POSTGRES_*` env vars; local development defaults to in-memory SQLite
  when no local override is present.
- **GitHub integration**: `integrations.github` on `github.com` via
  `GITHUB_TOKEN`. `@backstage/plugin-auth-backend-module-github-provider`
  is registered but inert until `auth.providers.github` is configured
  (kept out of the default config so local dev never depends on OAuth
  credentials).
- **Catalog model**: root `catalog-info.yaml` defines `Domain:
  internal-platform` -> `System: application-platform` -> `Component:
  platform-control-plane`, owned by the placeholder `group:default/guests`
  (from stock `examples/org.yaml`). Registered via two additional `type:
  file` locations in `app-config.yaml`/`app-config.production.yaml`, with
  `Domain` added to `catalog.rules` (the stock config didn't allow it).
- **Template**: `templates/platform-mfe-app/template.yaml` +
  `skeleton/`. Built-in actions only: `fetch:template` -> `publish:github`
  -> `catalog:register`, camelCase step ids
  (`fetchBase`/`publish`/`register`). Curated, enum-restricted capability
  list; `RepoUrlPicker` restricted to `github.com`; default branch fixed
  to `main` in the step input, not exposed as a parameter.
- **Skeleton**: minimal TypeScript foundation (`README.md`,
  `package.json`, `tsconfig.json`, `src/index.ts`, `catalog-info.yaml`,
  `platform-app.json`, `.env.example`, `.gitignore`,
  `.github/workflows/ci.yml`). `platform-app.json` matches the spec's
  schema exactly, with `capabilities` serialized via nunjucks's `dump`
  filter so it stays valid JSON. `ci.yml` is copied byte-for-byte
  (`copyWithoutRender`) so its own `${{ github.* }}` expressions survive
  scaffolder rendering.
- **Permissions**: `permission.enabled: true` and
  `plugin-permission-backend-module-allow-all-policy` were already present
  in the generated app - left as the documented local-only exception.
  Production config note added; no custom RBAC built (per spec, ahead of
  real identities).
- **Tests**: new workspace package `packages/template-validation`
  (Jest, run by `backstage-cli repo test`) covers template YAML validity
  (including Backstage's own `templateEntityV1beta3Validator`), required
  parameters, the capability enum, the `github.com` host restriction,
  camelCase step ids/order, `copyWithoutRender`, hermetic rendering of
  every skeleton file (via a local nunjucks environment configured
  identically to Backstage's `SecureTemplater`), catalog model
  structure/relationships, `app-config.yaml`/`app-config.production.yaml`
  wiring, docker-compose structure, and absence of committed secrets.
- **Docs**: `docs/getting-started.md`, `docs/github-integration.md`,
  `docs/app-template.md`, `docs/catalog-model.md`,
  `docs/adr/0001-backstage-as-app-factory.md`.

## Files created or changed

```
NEW    docker-compose.yml
NEW    .env.example
NEW    app-config.local.yaml.example
MOD    app-config.yaml                  (catalog rules/locations)
MOD    app-config.production.yaml       (catalog rules/locations, database field)
MOD    catalog-info.yaml                (Domain/System/Component)
MOD    packages/backend/src/index.ts    (+github auth provider module)
NEW    packages/template-validation/**  (tests, package.json, .eslintrc.js)
NEW    templates/platform-mfe-app/**    (template.yaml + skeleton)
NEW    docs/**
NEW    BACKSTAGE_APP_FACTORY_PHASE_1_REPORT.md
```

`packages/app/package.json` also shows a one-line diff (dependency
reordering from `yarn install`) - not an intentional change.

## Configuration required

| Variable | Required for | Notes |
| --- | --- | --- |
| `GITHUB_TOKEN` | template publish, GitHub reads | `repo` + `workflow` scopes |
| `AUTH_GITHUB_CLIENT_ID` / `_SECRET` | optional GitHub sign-in | inert unless `auth.providers.github` is uncommented in `app-config.local.yaml` |
| `POSTGRES_HOST/PORT/USER/PASSWORD/DB` | Postgres-backed local dev, production | matches `docker-compose.yml` defaults |

Backstage does **not** auto-load `.env` - values must be exported into the
shell before starting (see `docs/getting-started.md`).

## Commands executed (this session)

```
node .yarn/releases/yarn-4.13.0.cjs install
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs lint:all
node .yarn/releases/yarn-4.13.0.cjs workspace template-validation build
node .yarn/releases/yarn-4.13.0.cjs build:all
node .yarn/releases/yarn-4.13.0.cjs test:all
docker compose up -d
docker compose config --quiet
```

`yarn lint` (the package.json default script,
`backstage-cli repo lint --since origin/master`) fails in this repo
because `create-app` only ran a local `git init` - there is no
`origin/master` to diff against. `yarn lint:all` (full-repo lint, no diff)
was used instead and is what's reported clean below. Document this for
CI: either configure a remote or use `lint:all`.

## Test and build results

- **`tsc`**: clean (exit 0, no output).
- **`lint:all`**: clean across `packages/app`, `packages/backend`,
  `packages/template-validation` (8 files) - after two real fixes: a
  missing `.eslintrc.js` in the new package, and a `__dirname` usage that
  needed an explicit, justified `eslint-disable` (this package only runs
  under Jest, never as a bundled runtime plugin).
- **`template-validation` build**: failed once (`No declaration files
  found ... be sure to run yarn tsc`) until `tsc` was re-run to generate
  `dist-types/.../index.d.ts`; clean after.
- **`build:all`**: clean, `dist/` produced for both `app` and `backend`.
- **`test:all`**: clean on the final run - 6 test suites, 47 tests, all
  passing (1 in `app`'s `App.test.tsx`, 5 in `template-validation`;
  `backend` has no test file).

  On the first real run, 43 of 47 tests passed and 4 failed, all in
  `template-validation` (`platform-app.json`, `catalog-info.yaml`,
  `package.json`, and `README.md` rendering assertions). Root cause,
  found by reading `templateActionHandler.cjs.js` in the installed
  `@backstage/plugin-scaffolder-backend`: the real `fetch:template` action
  builds its render context as `{ values: ctx.input.values }`, but the
  test harness's `renderSkeleton` helper was passing the sample values
  object flat, so every `${{ values.x }}` in the skeleton resolved to
  empty. Fixed by nesting the context the same way; re-run passed.
- **`docker compose config --quiet`**: valid.

## Real end-to-end flow verified

Run against a **PostgreSQL-backed** backend (`docker compose up -d`,
`app-config.local.yaml` with the `pg` override, `POSTGRES_*` exported),
started standalone (`yarn workspace backend start`) after guest-token
authentication:

- **Postgres, not SQLite** (criterion 1): startup log shows two
  `FileConfigSource` paths (`app-config.yaml` + `app-config.local.yaml`),
  `catalog Performing database migration` succeeding, and - the
  discriminating line - `Postgres search engine is not supported,
  skipping registration of search-backend-module-pg` is **absent** (it
  was present on the earlier SQLite run). All 13 backend plugins reached
  `Plugin initialization complete`, including `kubernetes`,
  `user-settings`, `notifications`, `signals`, `mcp-actions` - the exact
  set that failed under the combined `yarn start` orchestrator (see Known
  Limitations).
- **Catalog contents** (criterion 2): `GET /api/catalog/entities` with a
  guest bearer token returned `Domain:internal-platform`,
  `System:application-platform`, `Component:platform-control-plane`, and
  `Template:platform-mfe-app`, alongside the stock `examples/` entities.
- **Template registered, page not visually re-checked** (criterion 3):
  `Template:platform-mfe-app` is confirmed present in the catalog API,
  and the frontend's `/create` route returns HTTP 200 (it's a single-page
  app shell - that proves routing, not that the template card renders).
  Two attempts to check the actual rendered page with the Chrome
  browser-automation tool both timed out (extension unresponsive in this
  session); not re-attempted a third time per this session's browser-tool
  guidance. **Not independently confirmed visually.**
- **Template rendering, in place of a live dry run** (criteria 4, 6, 7,
  8): the `POST /api/scaffolder/v2/dry-run` endpoint (and, by extension,
  the `/create/edit` browser dry run, which calls the same endpoint) is
  blocked by a Windows-specific defect: it resolves the supplied skeleton
  content against a temp path constructed by joining the OS temp
  directory onto a working-directory config value, and on this machine
  that produced `ENOENT: no such file or directory, lstat
  'D:\C:\Users\...\skeleton'` - an invalid path formed by concatenating a
  D: path with a C: path. A `backend.workingDirectory` override was tried
  and made it worse in a different way (same class of bug, different
  drive-letter collision), so it was reverted. This is an
  environment/OS interaction with the Backstage dry-run endpoint, not a
  defect in this template. **Coverage for what the dry run would have
  shown comes instead from `packages/template-validation`'s hermetic
  render tests**, which run the identical `${{ values.x }}` /
  `SecureTemplater`-equivalent nunjucks configuration against the real
  skeleton files and assert on the actual rendered `platform-app.json`,
  `catalog-info.yaml`, `README.md`, and `package.json` output.
- **No secret leakage on boot** (part of criterion 11): every backend
  startup logged `Found 1 new secrets in config that will be redacted`,
  and log lines containing the org/user name showed it masked as `***`.
  The other half of criterion 11 - that a *failed scaffolder step*
  produces actionable logs - was not exercised, since no step failure
  (as opposed to startup/dry-run failures) was triggered in this session.

## Steps blocked by missing external credentials

No `GITHUB_TOKEN` was available in this environment (`gh auth status`:
not logged in; env var unset). This blocks, individually:

- **Criterion 5**: actually creating a GitHub repository via
  `publish:github`.
- **Criterion 9**: the generated component being registered in the real
  Backstage Catalog (depends on 5 existing).
- **Criterion 10**: the task success screen's links to the repository and
  catalog entity (depends on 5 and 9).

Everything upstream of the `publish` step - form schema, capability
enum, host restriction, skeleton rendering, catalog model, docker
compose, tests, lint, typecheck, build - was verified without a token.

## Security decisions

- No token, client secret, or private key is committed; only
  `${ENV_VAR}` references appear in tracked files (enforced by
  `secrets.test.ts`, which also confirms `.env`/`*.local.yaml` stay
  gitignored).
- `backend.auth.dangerouslyDisableDefaultAuthPolicy` was never set, even
  while debugging the dry-run 401/500s - a guest token was minted and
  used instead.
- The GitHub OAuth provider module is registered but its config block is
  **commented out** in `app-config.local.yaml.example`, specifically
  because uncommenting it without both env vars set fails the backend
  (the module's config schema requires `clientId`/`clientSecret` once the
  block is present) - documented rather than worked around.
- Template capabilities are a closed enum; there is no free-text field
  for package names, install commands, or repository hosts anywhere in
  the form.

## Known limitations

- Combined `yarn start` (`backstage-cli repo start`) failed in this
  environment with `IPC request 'DevDataStore.load' timed out` for every
  `core.auth`-dependent plugin. Root cause not isolated (only the
  standalone-processes workaround was verified); documented as
  encountered, not attributed to a specific shell.
- The scaffolder `/v2/dry-run` endpoint (and the browser's `/create/edit`
  dry run) is blocked on this Windows machine by a path-joining defect
  when the project directory and OS temp directory are on different
  drive letters. Re-test on a non-Windows host, or with both on the same
  drive, before relying on it.
- The `/create` page's actual rendering of the Platform MFE Application
  card was not visually confirmed (Chrome browser-automation tool timed
  out twice); only its catalog registration and the route's HTTP 200 were
  checked.
- The stock `examples/` catalog data and template (`example-website`,
  `example-grpc-api`, `System:examples`, `example-nodejs-template`) are
  still registered alongside the platform entities - intentional (the
  spec asks to preserve generated architecture), but visible to anyone
  browsing the catalog.
- `group:default/guests` is a placeholder owner for every platform
  entity; there is no real GitHub org/team data yet.
- `yarn lint` (the default script) fails with no git remote configured;
  use `yarn lint:all` until a remote exists.
- GitHub OAuth sign-in, GitHub App migration, and criteria 5/9/10 above
  remain unverified end-to-end pending real credentials.

## Recommended Phase 2 work

1. Migrate `integrations.github` from `GITHUB_TOKEN` to a GitHub App once
   repositories move under an organization (path documented in
   `docs/github-integration.md`).
2. Replace `plugin-permission-backend-module-allow-all-policy` with a
   real policy that gates the scaffolder template-execution permission,
   once identities/groups exist to write a policy against.
3. Replace the `group:default/guests` placeholder owner across
   `catalog-info.yaml` and the template with real organizational data
   (import from GitHub or a real `org.yaml`).
4. Re-run the `/v2/dry-run` verification on a non-Windows host (or a
   single-drive Windows layout) to get positive live-server evidence for
   criteria 4/6/7/8 to complement the hermetic test suite.
5. Only after the above: begin the Nx capability composition and Module
   Federation runtime work that `platform-app.json`'s `capabilities` and
   `runtime` fields exist to support - explicitly out of scope here.

## Session state left running

The dev backend/frontend processes and Postgres container started during
the implementation session are no longer running (stopped between
sessions); nothing was left running as part of the publish step below.

## Phase 2 planning

Per the prompt, Phase 2 should be scoped only after these acceptance
criteria are reviewed against the gaps above - principally, obtaining a
`GITHUB_TOKEN` to complete criteria 5/9/10 live, and re-running the
dry-run verification on an environment without the Windows path defect.

## Publication (this session)

This session re-verified the implementation and published it, per a
separate "Publish Backstage App Factory Phase 1" instruction. It did not
change application behavior - only validation, gitignore hygiene, and
git/GitHub operations.

### Additional changes made for publication

- `.gitignore`: added `.env.local`, `.env.*.local`, `build/`, and `.omc/`
  (this repo's local agent-session state directory - not part of the
  Phase 1 deliverable, was untracked and is now explicitly ignored).
  `node_modules/`, `dist`/`dist-types`, `coverage`, `*.log`, `.DS_Store`,
  and `*.local.yaml` were already present from `create-app`'s defaults.

### Commands re-run and results (this session)

```
node .yarn/releases/yarn-4.13.0.cjs install     # clean (pre-existing peer-dep warnings only)
node .yarn/releases/yarn-4.13.0.cjs lint:all     # PASS
node .yarn/releases/yarn-4.13.0.cjs tsc          # PASS
node .yarn/releases/yarn-4.13.0.cjs test:all     # PASS - 6 suites, 47 tests
node .yarn/releases/yarn-4.13.0.cjs build:all    # PASS - dist/ for app + backend
docker compose config --quiet                    # valid
```

### Secret / sensitive-content scan

Regex scan of all tracked files (excluding the vendored
`.yarn/releases/yarn-4.13.0.cjs` binary, whose only matches were its own
CLI prompt strings, e.g. `"Input new password:"`, and an unrelated
base64/WASM blob substring) for GitHub tokens, AWS keys, PEM private
keys, and inline `password: "..."` literals found nothing. `.env` was
never created as a tracked file (only `.env.example`, placeholders only,
already tracked). `app-config.local.yaml` exists locally but is untracked
and matched by `*.local.yaml`. No machine-specific absolute paths
(`D:\...`, `C:\Users\...`) in tracked files other than a generic
`/home/node/...` Docker cache-mount path in `packages/backend/Dockerfile`
(not machine-specific). No local database files, build output, or
dependency directories are tracked.

### Git / GitHub publication status

- Branch `feat/backstage-app-factory-phase-1` created from `master`
  (`create-app`'s original `c0837ea` "Initial commit"), committed as
  `4e56dd8` "feat(platform): establish Backstage app factory foundation".
- At that point `gh auth status` reported not logged in and
  `git remote -v` was empty - push was correctly withheld and the
  manual-action commands were reported instead of a fabricated success.
- Between that point and the next step, GitHub credentials became
  available in this environment (`gh auth status` now shows an
  authenticated `phcaradanai` account) and the remote
  `https://github.com/phcaradanai/platform-control-plane.git` was
  configured, with `feat/backstage-app-factory-phase-1` already pushed.
- The local default branch was renamed `master` -> `main` (still pointing
  at `c0837ea`, unmodified) and pushed as `origin/main`; the GitHub
  repository's default branch was set to `main` via
  `gh repo edit --default-branch main` (confirmed via
  `gh repo view --json defaultBranchRef`).
- **Draft PR opened**: [#1](https://github.com/phcaradanai/platform-control-plane/pull/1),
  `feat(platform): Backstage App Factory Phase 1`,
  `feat/backstage-app-factory-phase-1` -> `main`, draft, unmerged.
- `gh pr checks 1`: **no checks reported** - this repository has no CI
  workflow of its own at the root (`.github/workflows/ci.yml` exists only
  inside `templates/platform-mfe-app/skeleton/`, for *generated*
  applications, not this control-plane repo). Nothing was waited on or
  fabricated as a check result.
- Repository visibility: **private** (`gh repo view`), matching the
  "private unless told otherwise" rule.
- No force-push, no history rewrite, no direct push to `main` - all work
  landed via the feature branch and an unmerged draft PR.

## Phase 1.1 Verification Closure

This phase turned the items PR #1 originally left as "not exercised" into
directly observed, reproducible evidence. No Nx generators, Module
Federation runtime, or CodeScape work was started - scope stayed to
closing Phase 1's own verification gaps.

### GitHub CI

- **Added**: root `.github/workflows/ci.yml` (this repo had none before -
  the skeleton's `ci.yml` is for *generated* apps, not this one), running
  `install --immutable`, `lint:all`, `tsc`, `test:all`, `build:all`,
  `docker compose config --quiet` on PRs to `main` and pushes to `main`.
- **Run**: [`31146840372`](https://github.com/phcaradanai/platform-control-plane/actions/runs/31146840372)
  on commit `8998614`, triggered by the push documented below.
- **Result**: **success** - every step (checkout, setup-node, install,
  lint, typecheck, test, build, docker-compose validation) passed.
- `yarn lint`'s `--since origin/master` was replaced with
  `--since origin/main` (the actual default branch now that a remote
  exists); CI itself uses `lint:all` (no diff base needed) since
  `actions/checkout` is shallow by default and `origin/main` history
  wouldn't be present to diff against.

### Backstage startup

- PostgreSQL-backed startup (`docker compose up -d` +
  `app-config.local.yaml`'s `pg` override) re-verified: backend log shows
  `Plugin initialization complete` for all 13 plugins and no "skipping
  registration of search-backend-module-pg" line (the SQLite tell).
  Frontend confirmed serving on `:3000`, backend on `:7007`.
- Catalog entities confirmed present via the API:
  `Domain:internal-platform`, `System:application-platform`,
  `Component:platform-control-plane`, `Template:platform-mfe-app`.
- **Combined `yarn start`**: not re-attempted this phase - the prior
  finding (`IPC request 'DevDataStore.load' timed out` for every
  `core.auth`-dependent plugin) is a `repo start` orchestrator/OS
  interaction, and the two-process workflow (`yarn workspace backend
  start` + `yarn workspace app start`) has now been used reliably across
  many restart cycles in both Phase 1 and this phase. Documented as the
  supported Windows path in `docs/getting-started.md`; not worth further
  risk to force `yarn start` to work.

### Browser smoke verification

Added to `packages/app/e2e-tests/` (Playwright, run via
`yarn playwright test packages/app/e2e-tests/`), executed against the
real running backend/frontend from this phase - all passing:

- `catalog.test.ts` - logs in as guest, navigates via the sidebar nav to
  `/catalog`, confirms `platform-control-plane` is a visible link.
- `create.test.ts` - two tests: the template card is visible on `/create`,
  and a full run through every step of the Platform MFE Application form
  (`/create/templates/default/platform-mfe-app`) confirming `name`,
  `title`, `description`, `owner` (step 1), `Repository Location` /
  `Repository Visibility` with `private`/`public` (step 2), `Lifecycle`
  (`experimental`/`production`) and `Application mode`
  (`platform-mfe`/`standalone`/`standalone-and-mfe`) (step 3), and all 13
  `Requested capabilities` checkboxes (step 4) are genuinely rendered and
  interactive - not just present in the page's initial HTML. The tests
  stop before the final Review/Create submission, so they don't create
  additional live GitHub repositories.
- `app.test.ts` (pre-existing, `create-app` default) continues to pass.

### Live scaffolder E2E - the main gate

**Result: succeeded**, after fixing one real defect found by running it.

- `GITHUB_TOKEN` was sourced from `gh auth token` (the already-
  authenticated local `gh` session) and exported into the backend process;
  never written to a file or logged.
- **First attempt failed** with `Unable to call 'failure', which is
  undefined or falsey` while rendering `.github/workflows/ci.yml`. Root
  cause: the installed `@backstage/plugin-scaffolder-backend`'s
  `fetch:template` action handler only wires the newer
  `copyWithoutTemplating` input into copy-without-rendering behavior -
  `copyWithoutRender` (what the template used) is still accepted by the
  action's schema but is a silent no-op in this version, so `ci.yml`'s
  `${{ failure() }}` / `${{ github.repository }}` GitHub Actions
  expressions were evaluated as scaffolder template syntax instead of
  being copied verbatim. This had passed every hermetic test in
  `packages/template-validation` because that suite reimplements its own
  copy-skip logic rather than exercising the real action handler - a real
  gap between the hermetic tests and reality that this phase closed.
  Fixed by switching `template.yaml` to `copyWithoutTemplating` (test
  suite updated to match) and confirmed with a second, successful run.
- Submitted via `POST /api/scaffolder/v2/tasks` directly (guest bearer
  token) against `template:default/platform-mfe-app`, rather than only
  through the browser, to get an unambiguous pass/fail independent of any
  browser-automation flakiness; the Playwright suite above separately
  proves the same values are reachable through the real form.
- Values used: `name: platform-factory-smoke-test`,
  `mode: platform-mfe`, `lifecycle: experimental`,
  `owner: group:default/guests` (existing group at the time of the run;
  the ownership-model change below happened afterward and doesn't
  invalidate this evidence - it doesn't touch template mechanics),
  `capabilities: [authentication, rbac, dashboard, history, theme,
  observability]`, `repoUrl: github.com?owner=phcaradanai&repo=platform-factory-smoke-test`,
  `repoVisibility: private`.
- Task `fced9010-3fb1-4da8-87ab-7c84c80e3c2d` reached `status: completed`.
  All three steps (`fetchBase`, `publish`, `register`) succeeded; the
  completion event's `output.links` pointed at the real repository and
  catalog entity.

### Dry-run endpoint (`/v2/dry-run`) - still blocked, now root-caused further

Re-tested with two probes (per the plan's cap): default environment
reproduced the originally reported `ENOENT ... lstat
'D:\C:\Users\...\skeleton'`; redirecting `TEMP`/`TMP` onto the same `D:`
drive as the project changed the error to `ENOENT ... lstat
'D:\D:\...\skeleton'` - the endpoint unconditionally prepends the
project's own drive letter onto the resolved workspace path regardless of
what that path already is, so no environment variable can fix it. This is
a structural Windows defect in the dry-run endpoint specifically, not
env-fixable and not present in the real task-execution endpoint (proven
by the successful live run above, which uses a different workspace-path
construction). No further attempts made; a non-Windows host or same-drive
retest remains the only path to closing this specific criterion.

### Generated repository validation

[`platform-factory-smoke-test`](https://github.com/phcaradanai/platform-factory-smoke-test)
(private, default branch `main`, initial commit present):

- All required files present: `README.md`, `package.json`,
  `tsconfig.json`, `src/index.ts`, `catalog-info.yaml`,
  `platform-app.json`, `.env.example`, `.gitignore`,
  `.github/workflows/ci.yml`.
- `.github/workflows/ci.yml` matches the skeleton **byte-for-byte**,
  including its live `${{ failure() }}` / `${{ github.repository }}` /
  `${{ github.sha }}` GitHub Actions expressions - direct proof the
  `copyWithoutTemplating` fix works against the real action.
- `platform-app.json`: `schemaVersion: "1.0"`, `id` and `title` match the
  submitted values, `mode: "platform-mfe"`,
  `owner: "group:default/guests"`, `capabilities` array matches the
  six selected values exactly, `runtime: { type: "module-federation",
  status: "not-configured" }`. No unresolved `${{ values.* }}` anywhere
  in any rendered file (checked all nine).
- `catalog-info.yaml`: correct component name, owner, `lifecycle:
  experimental`, `system: application-platform`, and
  `github.com/project-slug: phcaradanai/platform-factory-smoke-test`.

### Catalog registration

`GET /api/catalog/entities/by-name/component/default/platform-factory-smoke-test`
returned the entity with `backstage.io/managed-by-location` /
`backstage.io/source-location` pointing at
`https://github.com/phcaradanai/platform-factory-smoke-test/tree/main/`,
confirming the catalog correctly resolved the source from a real,
independently-created repository rather than a stale or fabricated
reference.

### Cleanup

- The generated `platform-factory-smoke-test` **catalog entry was
  unregistered** (`DELETE /api/catalog/locations/{id}`, confirmed 404 on
  re-query) so it no longer clutters the platform catalog.
- The **GitHub repository was intentionally left in place** as
  preservable evidence for this closure section. Deleting it would have
  required the `gh` CLI token to carry the `delete_repo` scope, which it
  does not by default; `gh auth refresh -s delete_repo` was attempted but
  requires an interactive device-code approval in a browser that this
  phase's automation could not complete unattended. It remains a private,
  otherwise-harmless repository under the same account that owns
  `platform-control-plane`.

### Minimal ownership model + demo clutter removal

- `examples/entities.yaml` (`System:examples`, `Component:example-website`,
  `API:example-grpc-api`) and `examples/template/` (the stock Node.js
  sample template) were removed, along with their catalog locations in
  `app-config.yaml` / `app-config.production.yaml`.
- `examples/org.yaml` was repurposed (same path, new content) from the
  stock `guests` group to `Group: platform-team`, now the owner of
  `internal-platform`, `application-platform`, `platform-control-plane`,
  and the `platform-mfe-app` template.
- Verified post-change: `Group:platform-team` present in the catalog,
  `System:examples` / `Component:example-website` / `API:example-grpc-api`
  absent, all four core platform entities still present and correctly
  owned.

### Security review

- Secret scan of every changed/added file (CI workflow, `org.yaml`,
  `catalog-info.yaml`, `template.yaml`, e2e tests, configs) found nothing
  matching token/key/password patterns; nothing new added to git tracks
  `.env` or credentials.
- `GITHUB_TOKEN` for the live E2E run above was sourced from `gh auth
  token` at runtime and never written to disk or printed.
- `RepoUrlPicker`'s `allowedHosts: [github.com]` and the closed
  capabilities enum are unchanged.
- Default `repoVisibility` remains `private`.
- Added an explicit comment in `packages/backend/src/index.ts` flagging
  `plugin-permission-backend-module-allow-all-policy` as a
  development-only placeholder that must not be treated as an acceptable
  production default.

### Remaining, explicitly out-of-scope-for-this-phase limitations

- `/v2/dry-run` (and the browser's `/create/edit` dry run) remains blocked
  on this Windows machine (see above) - not exercised as live positive
  evidence; the real task-execution path and the hermetic render tests
  substitute for it.
- The disposable `platform-factory-smoke-test` GitHub repository was not
  deleted (see Cleanup above) - a manual `gh repo delete
  phcaradanai/platform-factory-smoke-test` (after `gh auth refresh -s
  delete_repo` completes interactively) will remove it if desired.
- `group:default/platform-team` remains a placeholder with no real
  org/team data, per the original Phase 1 report's recommendation - out
  of scope here.
- No changes were made toward Nx generators, Module Federation runtime, or
  CodeScape integration - explicitly out of scope for this phase.

### Recommendation

**MERGE.** Every Phase 1.1 acceptance criterion has direct, reproducible
evidence above: real GitHub Actions CI passing on this commit, a
PostgreSQL-backed backend/frontend verified running with all four core
catalog entities present, real (not just HTML-presence) browser coverage
of `/catalog` and the full `/create` form, and - the load-bearing one - a
live `fetch:template` -> `publish:github` -> `catalog:register` run that
surfaced and fixed a genuine defect (`copyWithoutRender` vs
`copyWithoutTemplating`) that no amount of hermetic testing alone would
have caught. The one unresolved item (`/v2/dry-run` on Windows) is a
narrow, well-understood, non-blocking gap with a documented workaround
path, not a defect in this template.

## Phase 1.2: generated-repository CI green verification

Phase 1.1 verified that the scaffolder produces a repository with the
*correct files* (byte-identical `ci.yml`, correct `platform-app.json`,
correct `catalog-info.yaml`) but never checked whether GitHub Actions
actually **runs successfully** inside that generated repository. That
was a real gap, not a formality: the workflow file being copied
correctly says nothing about whether it passes once GitHub executes it
against a freshly generated project with no lockfile.

### What was found

A fresh live scaffolder run (`platform-factory-smoke-test-2`, task
`bfb9ea93-9480-45ac-b098-b163c30081c3`) completed successfully - repo
created, files present, catalog registered - exactly as in Phase 1.1.
But its GitHub Actions run
(https://github.com/phcaradanai/platform-factory-smoke-test-2/actions/runs/31148105305)
**failed**:

```
X Run actions/setup-node@v4
Dependencies lock file is not found in .../platform-factory-smoke-test-2.
Supported file patterns: package-lock.json, npm-shrinkwrap.json, yarn.lock
```

Root cause: the skeleton's `ci.yml` used `actions/setup-node@v4` with
`cache: npm`, which requires a committed lockfile to key its cache on.
The skeleton only ships `package.json` - no `npm install` is run during
scaffolding, so no lockfile is ever generated or committed. Every
application produced by this template would have had a red "CI" badge
on first push, before any real code was even written.

### Fix

Removed `cache: npm` from
`templates/platform-mfe-app/skeleton/.github/workflows/ci.yml` (commit
`739c07b`). `copyWithoutTemplating` still applies to the whole file, so
this is copied byte-for-byte like before -
`template-validation`'s byte-identical assertion (46/46 tests,
`CI=true yarn workspace template-validation test`) was re-run and still
passes because it diffs against the skeleton source directly, not a
hardcoded expectation.

### Re-verification

- Pushed `739c07b` to `feat/backstage-app-factory-phase-1`; control-plane
  CI run
  https://github.com/phcaradanai/platform-control-plane/actions/runs/31148778890
  passed (lint, typecheck, test, build, docker-compose config all green).
- Ran a second fresh live scaffolder task
  (`platform-factory-smoke-test-3`, task
  `ab10b3e8-3d18-4c65-8df6-0af0654fa352`) against the fixed template -
  repo created, catalog registered, and its GitHub Actions run
  https://github.com/phcaradanai/platform-factory-smoke-test-3/actions/runs/31148809025
  **succeeded** (`build` job green in 13s: checkout, setup-node, npm
  install, typecheck, build all passed).
- This closes the loop the spec asked for: not just "the generated repo
  has the right files" but "the generated repo's own CI is green."

### Cleanup (Phase 1.2 additions)

- Both `platform-factory-smoke-test-2` and `platform-factory-smoke-test-3`
  catalog entries were unregistered (`DELETE
  /api/catalog/entities/by-uid/{uid}`, `204` for both).
- Both GitHub repositories were preserved as evidence, same reasoning as
  Phase 1.1: the token still lacks `delete_repo` scope (`gh auth status`
  reconfirmed `gist, read:org, repo, workflow` only - no interactive
  device-code approval available in this session). They, along with
  `platform-factory-smoke-test` from Phase 1.1, are the disposable
  evidence repos left under `phcaradanai/` pending manual deletion.

### Updated recommendation

**MERGE.** The generated-CI gap identified in this pass is now fixed and
independently re-verified end-to-end (new live scaffolder run -> new
repo -> its own Actions run green), not just asserted. Combined with
Phase 1.1's closure, both the control-plane's own CI and every
application it generates are now confirmed green on real GitHub Actions
runs, not just locally.
