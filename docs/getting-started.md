# Getting Started

## Prerequisites

- Node.js 22 (the repo's `package.json` allows `22 || 24`; this project was
  built and verified on Node 22 because several native dependencies -
  `better-sqlite3`, `keytar`, `isolated-vm` - are compiled against the Node
  ABI at install time)
- Corepack-enabled Yarn is not required: the repository vendors its own
  pinned Yarn release at `.yarn/releases/yarn-4.13.0.cjs`, so you can always
  run `node .yarn/releases/yarn-4.13.0.cjs <command>` even if a bare `yarn`
  binary isn't on your `PATH`
- Docker (for local PostgreSQL)
- A GitHub account and, optionally, a personal access token (see
  [github-integration.md](./github-integration.md))

## Install dependencies

```bash
node .yarn/releases/yarn-4.13.0.cjs install
```

## Environment variables

**Backstage does not read `.env` files automatically.** Copy
[`../.env.example`](../.env.example) to `.env`, fill in real values, then
export them into the shell you'll run Backstage from before starting it:

```bash
# bash / git bash
cp .env.example .env   # then edit .env with real values
set -a; source .env; set +a
```

```powershell
# PowerShell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}
```

At minimum for local development you can run with everything unset - the
app boots with the guest auth provider and an in-memory SQLite database.
`GITHUB_TOKEN` is only required once you actually run the Platform MFE
Application template's publish step.

## Run PostgreSQL locally (optional but required for acceptance criterion "runs with PostgreSQL")

```bash
docker compose up -d
docker compose ps        # wait for the postgres healthcheck to report healthy
```

Then point Backstage at it:

```bash
cp app-config.local.yaml.example app-config.local.yaml
```

`app-config.local.yaml` is gitignored (`*.local.yaml`) and is merged on top
of `app-config.yaml` automatically - no `--config` flag needed. Export the
`POSTGRES_*` variables from `.env.example` first (the defaults there match
`docker-compose.yml`'s defaults).

Backstage runs its catalog/scaffolder database migrations automatically on
startup; there is no separate migration command to run.

## Start Backstage

```bash
node .yarn/releases/yarn-4.13.0.cjs start
```

This runs `backstage-cli repo start`, which starts the frontend
(`http://localhost:3000`) and backend (`http://localhost:7007`) together.

### Supported Windows workflow: two-process startup

On Windows, the combined `yarn start` (`backstage-cli repo start`) has
been observed to fail with:

```
Error: IPC request 'DevDataStore.load' with ID 8 timed out
```

for every plugin that depends on `core.auth` in dev mode (`kubernetes`,
`user-settings`, `notifications`, `signals`, `mcp-actions`). This is the
`repo start` orchestrator's IPC channel between the parent CLI process and
its forked backend child failing to establish - a dev-harness/OS
interaction, not an application defect; the root cause (shell, OS,
antivirus, etc.) was not isolated further since a fully reliable
alternative exists.

**The supported Windows development path is the two-process workflow**,
re-verified in Phase 1.1 across multiple full backend/frontend restart
cycles with no failures:

```bash
# terminal 1
node .yarn/releases/yarn-4.13.0.cjs dev:backend

# terminal 2
node .yarn/releases/yarn-4.13.0.cjs dev:app
```

(`dev:backend` and `dev:app` are root package.json scripts that run
`yarn workspace backend start` / `yarn workspace app start` with the
vendored Yarn release.)

Use this instead of `yarn start` on Windows. If you're on macOS/Linux and
`yarn start` works for you, either workflow is fine.

## Verify it's running

- Frontend: <http://localhost:3000> (redirects to `/catalog`)
- Backend readiness: `GET http://localhost:7007/.backstage/health/v1/readiness`
  returns `200` with `{"status":"ok"}` once the backend has finished
  starting (it returns `503` while starting up). The frontend polls this
  endpoint and shows a "Backend unavailable" banner while it is not ready,
  so the UI never appears healthy when the catalog/scaffolder APIs are
  unreachable.
- Backend APIs: Backstage's backend APIs require a bearer token even for
  the guest provider. To check manually:

  ```bash
  curl -s -X POST http://localhost:7007/api/auth/guest/refresh \
    -H 'Content-Type: application/json' -d '{}'
  # copy backstageIdentity.token from the response, then:
  curl -s http://localhost:7007/api/catalog/entities \
    -H "Authorization: Bearer <token>"
  ```

- The catalog entities API (above) returns `platform-control-plane`
  (Component), `application-platform` (System), `internal-platform`
  (Domain), and `platform-mfe-app` (Template).
- `/catalog` and `/create` rendering in the browser, including the
  Platform MFE Application template card and its full multi-step form, are
  covered by real Playwright browser tests - see
  `packages/app/e2e-tests/catalog.test.ts` and `create.test.ts`. Run them
  with:

  ```bash
  node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
  ```

  Playwright starts the backend and frontend itself (the same two-process
  startup documented above), waits for the backend readiness endpoint, and
  drives the guest login → catalog → create flow in a real browser. These
  same smoke tests run in CI on every push/PR (the `e2e` job in
  `.github/workflows/ci.yml`). If you already have a backend/frontend
  running, `reuseExistingServer` makes Playwright use them instead of
  starting new ones.

## Validation commands

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all     # yarn lint uses --since origin/main, which needs full history; use lint:all in CI/shallow checkouts
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all
docker compose config --quiet                     # validates docker-compose.yml
```

These same commands run automatically in GitHub Actions CI on every pull
request to `main` and every push to `main` - see
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Creating an application

1. Open `/create`.
2. Choose **Platform MFE Application**.
3. Fill in identity (name, title, description, owner), repository
   (GitHub location + visibility), lifecycle, mode, and capabilities.
4. Submit. On success you get links to the new GitHub repository and its
   catalog entity.

See [app-template.md](./app-template.md) for what gets generated and
[catalog-model.md](./catalog-model.md) for how it's registered.

## Known limitations

- No production deployment, Module Federation runtime, or Nx capability
  composition - this phase only covers the Backstage control plane (see
  the project prompt's "Out of Scope" section).
- GitHub OAuth sign-in is wired but inert until `AUTH_GITHUB_CLIENT_ID` /
  `AUTH_GITHUB_CLIENT_SECRET` are configured; local development uses the
  guest provider by default, and the sign-in page shows Guest only until
  you opt in. To opt in, uncomment **both** the `auth.providers.github`
  block **and** `auth.localGithubEnabled: true` together in
  `app-config.local.yaml.example` - uncommenting only one leaves either a
  configured provider with no button, or a button with nothing behind it
  (see [identity-and-access.md](./identity-and-access.md)'s "Sign-in page
  (frontend)" section for why both are needed). It's the real, required
  sign-in path in production (`app-config.production.yaml` disables guest
  entirely) - see [identity-and-access.md](./identity-and-access.md). A
  real GitHub OAuth app + a real browser consent flow have been exercised
  end to end (Phase 3.1 closure), including the catalog gate rejecting an
  unprovisioned account and accepting a provisioned one.
- If the dev backend stays on readiness `503` with `better-sqlite3 ...
  NODE_MODULE_VERSION ... Please try re-compiling` in the log, the native
  module was built for a different Node ABI than the backend runs under
  (this happens when `yarn install` runs under a newer Node than the one
  the backend re-execs to - the repo's engines are `22 || 24`). Fix by
  rebuilding with the runtime Node, e.g.
  `PATH="$(dirname "$(which node)")" npm rebuild better-sqlite3` or a
  targeted `node-gyp rebuild` under the Node version the backend actually
  uses.
- The full `fetch:template` -> `publish:github` -> `catalog:register` chain,
  including a real `GITHUB_TOKEN` and a live GitHub repository creation,
  has been exercised end-to-end (Phase 1.1) - see
  `BACKSTAGE_APP_FACTORY_PHASE_1_REPORT.md`'s "Phase 1.1 Verification
  Closure" section for the run details.
- Permissions are enforced by a real Platform Admin / Developer policy
  (`packages/backend/src/permissions/policy.ts`) as of Phase 3.1 - see
  [identity-and-access.md](./identity-and-access.md). Real
  Keycloak/enterprise IdP integration, a tenant system, and
  conditional/resource-scoped permission rules remain out of scope.
