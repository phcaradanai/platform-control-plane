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
