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

### Known limitation: combined `yarn start` failed in this environment

When this app was verified on Windows, running the combined `yarn start`
(`backstage-cli repo start`) produced a backend startup failure:

```
Error: IPC request 'DevDataStore.load' with ID 8 timed out
```

for every plugin that depends on `core.auth` in dev mode (`kubernetes`,
`user-settings`, `notifications`, `signals`, `mcp-actions`). This is the
`repo start` orchestrator's IPC channel between the parent CLI process and
its forked backend child failing to establish - a dev-harness issue, not
an application defect. It was **not** re-tested after switching away from
it, so no root cause (shell, OS, antivirus, etc.) is confirmed.

The workaround that was verified to work is running the two packages
independently instead of through the combined orchestrator:

```bash
# terminal 1
node .yarn/releases/yarn-4.13.0.cjs workspace backend start

# terminal 2
node .yarn/releases/yarn-4.13.0.cjs workspace app start
```

If `yarn start` hangs or fails with a similar IPC timeout, use the
two-terminal workaround above.

## Verify it's running

- Frontend: <http://localhost:3000> (redirects to `/catalog`)
- Backend health: `GET http://localhost:7007/api/catalog/entities` returns
  `401` until authenticated - that's expected. Backstage's backend APIs
  require a bearer token even for the guest provider. To check manually:

  ```bash
  curl -s -X POST http://localhost:7007/api/auth/guest/refresh \
    -H 'Content-Type: application/json' -d '{}'
  # copy backstageIdentity.token from the response, then:
  curl -s http://localhost:7007/api/catalog/entities \
    -H "Authorization: Bearer <token>"
  ```

- The catalog entities API (above) returns `platform-control-plane`
  (Component), `application-platform` (System), `internal-platform`
  (Domain), and `platform-mfe-app` (Template) - confirmed in this
  environment. Whether `/catalog` and `/create` render them correctly in
  the browser was not independently re-verified after the config changes
  in this phase (see the Phase 1 report); the frontend route `/create`
  does return an HTTP 200 page shell.

## Validation commands

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all     # yarn lint uses --since origin/master, which fails with no remote
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all
docker compose config --quiet                     # validates docker-compose.yml
```

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
  guest provider by default.
- The template's `publish:github` step was validated up to the point where
  it requires a real `GITHUB_TOKEN`; the live repository-creation call
  itself was not exercised in this environment because no token was
  available (see the Phase 1 report for what was and wasn't verified
  end-to-end).
