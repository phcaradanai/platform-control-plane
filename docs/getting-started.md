# Getting started

This guide takes a new developer from a clean checkout to a running Backstage
control plane and the Design System Portal.

## Prerequisites

- Node.js 22 is the supported baseline used by CI. The root package also
  allows Node 24; generated applications require Node `>=22.12`.
- Docker is optional for the default in-memory SQLite boot and required only
  for the local PostgreSQL option.
- A GitHub account and token are required only when App Factory must validate,
  create, and push to a repository. See [GitHub integration](github-integration.md).
- Use the same environment for Node, Yarn, and `node_modules`. In WSL, do not
  reuse a Windows-built dependency tree.

## Install

Run from `platform-control-plane`:

```bash
node .yarn/releases/yarn-4.13.0.cjs install --immutable
```

The repository vendors Yarn `4.13.0`, so a global Corepack/Yarn installation
is not required.

## Configure the shell

Backstage does not automatically load `.env` for the two-process workflow.
Copy `.env.example` for reference and export only the values you need in the
terminal that starts the backend:

```powershell
Copy-Item .env.example .env
$env:GITHUB_TOKEN = '<token>'
```

Do not commit `.env` or paste secrets into logs. For bash, use `cp .env.example
.env`, then `set -a; source .env; set +a` after editing it.

The backend configuration references `GITHUB_TOKEN`, so define that variable in
the backend process even when you are only reviewing Catalog. A non-empty token
is needed for App Factory repository validation/publishing. GitHub OAuth
variables are needed only when enabling the optional local GitHub sign-in
configuration. If `app-config.local.yaml` exists in your checkout, also export
the `POSTGRES_*` variables it references.

## Start Backstage

Use two terminals. This is the reliable Windows workflow and works on all
supported development environments:

```bash
# terminal 1
node .yarn/releases/yarn-4.13.0.cjs dev:backend

# terminal 2
node .yarn/releases/yarn-4.13.0.cjs dev:app
```

The services are:

- Backstage frontend: <http://localhost:3000>
- Backstage backend: <http://localhost:7007>
- Readiness: <http://localhost:7007/.backstage/health/v1/readiness>

The readiness endpoint returns `503` while plugins are starting and `200` with
an OK response once the backend is ready. The frontend shows a
**Backend unavailable** banner until that endpoint can be reached.

The root `start` script still exists for environments where Backstage's
combined process runner is reliable, but the two-process workflow is the
documented path on Windows and is the path used by Playwright.

## Verify the control plane

1. Open <http://localhost:3000>.
2. Choose **Enter** for local Guest auth.
3. Open **Catalog** and confirm `platform-control-plane` is listed.
4. Open **Create** and confirm **Platform MFE Application** is listed.

For a shell-level readiness check, use `curl` or `curl.exe`:

```bash
curl -s http://localhost:7007/.backstage/health/v1/readiness
```

Backstage APIs require a bearer token. The local Guest flow can be checked
with:

```bash
curl -s -X POST http://localhost:7007/api/auth/guest/refresh \
  -H 'Content-Type: application/json' -d '{}'
```

Use the returned `backstageIdentity.token` in an `Authorization: Bearer`
header when calling Catalog APIs.

## Use the Design System Portal

In a third terminal:

```bash
node .yarn/releases/yarn-4.13.0.cjs dev:portal
```

Open <http://127.0.0.1:6006>. The portal is the source-backed review surface
for `@platform/ui`; see [Design System Portal](design-system-portal.md).

## Optional PostgreSQL

The default in-memory database is enough for local exploration. To persist
Backstage data locally:

```bash
docker compose up -d
docker compose ps
```

Then copy the local config:

```powershell
Copy-Item app-config.local.yaml.example app-config.local.yaml
```

Export the `POSTGRES_*` variables from `.env.example` before starting the
backend. The local config is gitignored and overrides the in-memory database.
Backstage runs its migrations during startup; there is no separate migration
command in this repository.

## Create an application

With the control plane running, use **Create** → **Platform MFE Application**.
The full form, capability status, runtime modes, generated output, and GitHub
requirements are in the [App Factory guide](app-template.md).

## Repository validation

Run the same checks as platform CI:

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all
node .yarn/releases/yarn-4.13.0.cjs build:portal
docker compose config --quiet
node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
```

The E2E smoke command starts the backend and frontend itself unless it can
reuse already-running servers. CI also installs Chromium and supplies a
GitHub token for the App Factory form's repository checks.

## Windows and WSL notes

- Prefer `node .yarn/releases/yarn-4.13.0.cjs ...` over a global `yarn` so the
  pinned version is used.
- Run backend and frontend in separate terminals. If a process was started
  from Windows, stop it before starting the same service in WSL.
- Keep `node_modules` on the same filesystem/runtime that runs Node. Native
  `better-sqlite3` ABI errors usually mean install and runtime used different
  Node versions or environments.
- PowerShell does not interpret bash `export`; set `$env:NAME` in the process
  that starts Backstage. WSL should source the environment in its own shell.
- Use `curl.exe` in PowerShell if the PowerShell web-request alias gets in the
  way.

For failures, go to [Troubleshooting](troubleshooting.md).
