# Platform Control Plane (Backstage App Factory)

A Backstage control plane that scaffolds production React applications into
GitHub repositories via the **Platform MFE Application** software template
(`fetch:template` → `publish:github` → `catalog:register`).

- **Frontend:** http://localhost:3000 (guest login → Catalog → Create)
- **Backend:** http://localhost:7007
- **Backend readiness:** `http://localhost:7007/.backstage/health/v1/readiness`
  (returns `503` until startup completes, then `200`)

The frontend shows a "Backend unavailable" banner whenever the backend
readiness endpoint is unreachable, so the UI never looks healthy while the
catalog/scaffolder APIs are down.

## Prerequisites

- Node.js 22
- Docker (optional — only needed for the PostgreSQL setup)
- A GitHub account + personal access token (only required when actually
  running the template's publish step)

## Install

```bash
node .yarn/releases/yarn-4.13.0.cjs install
```

## Start (the supported workflow)

Backstage's combined `yarn start` is unreliable on Windows (an IPC timeout
in the `repo start` orchestrator). The supported workflow is two processes,
which is also exactly what the Playwright smoke tests start:

```bash
# terminal 1 — backend (port 7007)
node .yarn/releases/yarn-4.13.0.cjs dev:backend

# terminal 2 — frontend (port 3000)
node .yarn/releases/yarn-4.13.0.cjs dev:app
```

Or via the root scripts: `yarn dev:backend` and `yarn dev:app`.

The app boots with guest auth and an in-memory SQLite database; nothing
else is required to get started. `GITHUB_TOKEN` is only needed for the
template's publish step.

## Verify it's running

```bash
# Backend readiness (200 = up; 503 = still starting)
curl -s http://localhost:7007/.backstage/health/v1/readiness

# Guest token, then catalog entities
curl -s -X POST http://localhost:7007/api/auth/guest/refresh \
  -H 'Content-Type: application/json' -d '{}'
curl -s http://localhost:7007/api/catalog/entities \
  -H "Authorization: Bearer <backstageIdentity.token>"
```

Then open http://localhost:3000 → **Enter** (guest) → **Catalog** (should
list `platform-control-plane` and friends, no 404) → **Create** (should
show the **Platform MFE Application** template).

## Tests

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all

# End-to-end: guest -> catalog -> create smoke tests in a real browser.
# Playwright starts the backend + frontend itself (webServer config).
node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
```

All of the above run in GitHub Actions CI on every push/PR (the e2e job
starts both processes and runs the Catalog/Create smoke tests).

## Documentation

- [`docs/getting-started.md`](docs/getting-started.md) — full developer
  setup (env vars, PostgreSQL, troubleshooting)
- [`docs/app-template.md`](docs/app-template.md) — what the template
  generates
- [`docs/catalog-model.md`](docs/catalog-model.md) — catalog entities
- [`docs/github-integration.md`](docs/github-integration.md) — GitHub token
  / integration setup
- [`BACKSTAGE_APP_FACTORY_PHASE_2_REPORT.md`](BACKSTAGE_APP_FACTORY_PHASE_2_REPORT.md)
  — phase reports and verification evidence
