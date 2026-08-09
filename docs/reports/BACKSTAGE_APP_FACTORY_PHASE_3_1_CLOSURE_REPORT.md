# Backstage App Factory — Phase 3.1 Identity Closure Report

Repository: `phcaradanai/platform-control-plane`
Branch: `main`
Date: 2026-08-09

## Goal

Close the remaining identity gap from the Phase 3.1 foundation: prove the
real production authentication and role model works end to end — real
GitHub OAuth sign-in against the production-style configuration, a clean
provisioning path for catalog users and Platform Admin membership, a
normal Developer allowed to use the App Factory but denied privileged
actions, a Platform Admin able to perform privileged actions, and guest
access unusable in production — while leaving the deny-by-default
permission architecture unchanged and preserving local guest development,
the App Factory, generated apps, tests, and CI.

## What was already in place (foundation commit `973581d`)

`PlatformAccessPolicy` (admin = `group:default/platform-admins`, Developer
= allow-list of 11 catalog/scaffolder permissions, deny-by-default
otherwise, unauthenticated = deny), production overlay that deletes the
guest provider (`guest: null`) and configures GitHub OAuth sign-in with
`usernameMatchingUserEntityName` and no catalog bypass, and unit tests for
the policy. The known gap documented in `docs/identity-and-access.md`:
full OAuth browser sign-in had **not** been exercised (no registered
OAuth app, no browser session), and there was no provisioning path beyond
hand-editing the placeholder org file.

## What this closure adds

1. **Clean provisioning path** — `scripts/provision-identities.mjs`
   (dependency-free Node): takes GitHub logins + group memberships
   (JSON file or inline), validates them against exactly what the sign-in
   resolver and policy rely on (lowercase login = entity name, known
   groups only, no duplicates), and renders the catalog org-data file.
   `examples/org.provisioned.yaml` is the committed production org file
   (groups-only skeleton: nobody can sign in, nobody is an admin until
   provisioned); `app-config.production.yaml` now imports it instead of
   the dev `examples/org.yaml`, so the local `guest` fixture never exists
   in the production catalog. A `--check` mode re-renders from the same
   input and fails on drift/tampering (CI-guardable).
2. **Real GitHub OAuth credentials** — a real GitHub App
   (`platform-control-plane-auth`, App ID 4534952) registered in the
   account's org via the one supported route (GitHub removed the REST
   endpoint that creates apps; the manifest flow requires a logged-in
   browser, which was completed in the account-owner's own browser).
   Credentials live in gitignored `github-app-platform-control-plane-credentials.yaml`
   + `.env`; only `${AUTH_GITHUB_CLIENT_ID}` / `${AUTH_GITHUB_CLIENT_SECRET}`
   references appear in tracked config. `docs/github-integration.md` now
   documents the manifest flow.
3. **Hermetic tests / CI guards**:
   - `packages/backend/src/permissions/signInResolver.test.ts` — the
     production sign-in gate contract (entityRef handed to the catalog
     lookup; no bypass unless the dangerous flag is explicitly passed).
   - `packages/template-validation/src/productionConfig.test.ts` — loads
     `app-config.yaml` + `app-config.production.yaml` through Backstage's
     real config loader (env substitution + merge semantics, same
     pipeline as `backstage-cli config:print`): merged production config
     has **no guest provider**, GitHub sign-in without the dangerous
     flag, production catalog imports the provisioned org file.
   - `packages/template-validation/src/identityProvisioning.test.ts` —
     exercises the provisioning script (rendering, validation
     rejections, `--check`, strict-parser acceptance). This caught a real
     bug during the closure run: user descriptions containing
     `GitHub login: <name>` (a `: ` inside a plain YAML scalar) were
     rejected by the catalog's strict js-yaml parser, silently dropping
     every provisioned User entity; the script now emits quoted
     descriptions and the test guards it.
   - `yarn.lock` updated for the new devDependencies
     (`@backstage/config-loader`, `@backstage/config`,
     `@backstage/catalog-model`, `js-yaml`).

## Live verification (real backend, real GitHub)

Environment: dev = in-memory SQLite; production-style boot =
`app-config.yaml` + `app-config.production.yaml` + the repo's
`docker-compose` PostgreSQL; real GitHub App credentials; the real GitHub
account signed in through a real browser (account-owner's browser,
reusing its login state).

### 1. Guest cannot be used in production

`GET /api/auth/guest/start?env=production` on the production boot ->
**HTTP 404** (no guest provider exists in the merged production config).
A `POST /api/permission/authorize` with no token at all ->
**HTTP 401** (the backend's default auth policy rejects unauthenticated
requests before the permission policy is consulted).

### 2. Production GitHub wiring is real

`GET /api/auth/github/start?env=production` -> **302** to
`https://github.com/login/oauth/authorize` with
`client_id=Iv23liNtMjPNfBOrFnhR` (the real registered app),
`redirect_uri=http://localhost:7007/api/auth/github/handler/frame`, and
`scope=read:user user:email`.

### 3. Real OAuth sign-in: the catalog gate rejects and accepts

- **Unprovisioned**: the real GitHub account completed the full OAuth
  consent flow (real code issued by GitHub, exchanged by the backend,
  real GitHub user profile returned). The frame callback returned the
  sign-in failure: `Failed to sign-in, unable to resolve user identity.
  Please verify that your catalog contains the expected User entities
  that would match your configured sign-in resolver.` — the account had
  no `User` entity in the production catalog (groups-only skeleton), so
  sign-in was denied.
- **Provisioned**: the same account was provisioned via
  `scripts/provision-identities.mjs` (fixture org file, gitignored) with
  `platform-admins` membership and the backend rebooted with a test
  overlay pointing the production catalog's identity location at it. The
  sign-in succeeded: `backstageIdentity.identity.userEntityRef =
  user:default/phcaradanai`, `ownershipEntityRefs = [user:default/phcaradanai,
  group:default/platform-admins]`, GitHub user token scoped
  `read:user user:email`.

### 4. Platform Admin can perform privileged actions

`POST /api/permission/authorize` with the **real signed-in token**:

| Permission | Result |
|---|---|
| catalog.entity.read / create | ALLOW |
| catalog.entity.delete | ALLOW |
| catalog.location.delete | ALLOW |
| scaffolder.template.management | ALLOW |
| catalog.entity.validate | ALLOW |
| catalog.entity.refresh | ALLOW |
| scaffolder.task.create / location.create / action.execute | ALLOW |

### 5. Developer is allowed App Factory actions, denied privileged ones

Dev boot with a test-only overlay (gitignored `.hermes/test-overlay.local.yaml`)
pointing the dev-only guest provider at fixture catalog users (the same
policy input any GitHub-signed-in non-admin has; fixture identities
generated by the provisioning script). Identity:
`user:default/dev-fixture`, `ownershipEntityRefs =
[user:default/dev-fixture, group:default/platform-team]`.

Allowed (all 11 App Factory permissions): catalog entity read/create,
location read/create/analyze, template parameter read, template step
read, action execute, task create/read/cancel — **ALL ALLOW**.

Denied (all 5 privileged permissions): catalog entity delete/refresh/
validate, location delete, template management — **ALL DENY**.

### 6. Policy architecture unchanged

No change to `PlatformAccessPolicy` or its module; the deny-by-default
model, the 11-permission Developer allow-list, and the admin group check
are exactly as committed in the foundation. The only policy-adjacent
changes are the new tests and the production config's catalog location
pointing at the provisioned org file (a defect fix: the overlay's
location targets used `./` prefixes that only resolve in a root-cwd
deploy context that does not exist yet; they now use the same `../../`
convention as `app-config.yaml`, with a comment for a future root-cwd
deployment).

## Regression / preservation

- Full suite (`backstage-cli repo test --coverage`, the CI gate): see
  results below. Local guest development, the App Factory create flow,
  generated apps, and CI commands are unchanged.
- The e2e smoke suite (`test:e2e:smoke`) is untouched; the dev backend it
  boots uses the same in-memory SQLite + guest path as before.
- No identity of a real person is committed: the real GitHub login
  appears only in gitignored fixtures generated at verification time;
  the committed `examples/org.provisioned.yaml` is a groups-only
  skeleton.

## Environment note (not a repo defect)

The dev backend here initially stayed on readiness 503: `better-sqlite3`
had been rebuilt for Node 26 (ABI 147) by `yarn install` while the
backend re-execs to Node 22 (ABI 127) — the repo's engines are `22 || 24`.
Rebuilt with the runtime Node (`npm rebuild better-sqlite3` under Node
22); documented in `docs/getting-started.md`'s "Known limitations".

## Test results

`backstage-cli repo test --coverage` (the CI gate): **13 suites / 99 tests,
all passing** (baseline before this phase: 10 suites / 77 tests). The
closure session surfaced and fixed one real defect (unquoted user
descriptions, see above) and two test-harness issues (a
`repoRoot`-resolution helper that no longer depends on `__dirname`'s
depth, and the config-merge step required to actually exercise
Backstage's merge semantics); `tsc`, `lint:all`, `build:all`, and
`docker compose config` are green.

## Verdict

Phase 3.1 Identity Closure: **PASS**

Recommendation: **READY FOR PHASE 4**
