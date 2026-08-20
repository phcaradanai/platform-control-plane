# Troubleshooting

Use the readiness endpoint and the terminal that owns the failing process to
separate frontend, backend, configuration, and generated-app problems.

## Platform startup

### Backend stays on readiness `503`

`503` is expected while Backstage is starting. Wait for:

```text
http://localhost:7007/.backstage/health/v1/readiness
```

If it never becomes `200`, read the backend terminal. Common causes are a
missing environment variable for a config block, a port already in use, a
PostgreSQL connection failure, or a native module built under a different Node
version. The repository baseline is Node 22; reinstall or rebuild dependencies
from the same Node runtime that starts the backend.

### The combined `start` command fails on Windows

Use the supported two-process workflow instead:

```powershell
node .yarn/releases/yarn-4.13.0.cjs dev:backend
node .yarn/releases/yarn-4.13.0.cjs dev:app
```

Run them in separate terminals. The two-process setup is also the one used by
the Playwright web-server configuration.

### Port `3000`, `7007`, or `6006` is busy

Close the process that owns the port or choose a different development port
for the affected tool. Check the terminal output first; do not start several
Backstage backends against the same port. The frontend's readiness banner is
expected until it can reach the backend.

## Playwright smoke tests

### Playwright times out before the tests run

`node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke` starts the backend and
frontend through Playwright's `webServer` entries. Those commands do not run
the root `start` script's `dotenv` wrapper. Export every variable referenced by
the active config in the same shell before running the test; at minimum the
backend config expects `GITHUB_TOKEN` to be defined:

```powershell
$env:GITHUB_TOKEN = '<token-or-empty-value-for-ui-only-boot>'
# Only when app-config.local.yaml exists:
$env:POSTGRES_HOST = 'localhost'
$env:POSTGRES_PORT = '5432'
$env:POSTGRES_USER = 'backstage'
$env:POSTGRES_PASSWORD = 'backstage'
$env:POSTGRES_DB = 'backstage'
node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
```

A real token is required for GitHub repository checks or publishing. If the
readiness URL is still not `200`, run the two-process startup manually and
inspect the backend terminal; a missing variable, a stale process on port
`7007`, or a PostgreSQL override without a reachable database is the useful
failure signal.

## Backstage frontend/backend behavior

### The app shows “Backend unavailable”

Open the readiness URL directly. If it is not `200`, fix the backend first. If
it is `200`, inspect the browser Network tab for requests to
`http://localhost:7007` and verify that the frontend was started with the
expected app configuration and port.

### Catalog or Create is empty

Sign in with **Enter** first. Then check that the backend has loaded:

- `catalog-info.yaml` for the control plane;
- `examples/org.yaml` for the local `platform-team` owner group;
- `templates/platform-mfe-app/template.yaml` for the template.

The Catalog model and file-location rules are documented in
[catalog-model.md](catalog-model.md). A backend startup error or catalog
processor error is more useful than refreshing the browser repeatedly.

### GitHub sign-in is not shown locally

That is the default. Local development uses Guest unless both the
`auth.localGithubEnabled` flag and the `auth.providers.github.development`
block are enabled in `app-config.local.yaml`, with
`AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` exported. Do not
enable only one half of the configuration.

Production intentionally removes Guest and requires GitHub OAuth plus a
matching catalog `User`. See [identity and access](identity-and-access.md).

## GitHub and App Factory

### Repository validation or publish fails

The control plane reads `GITHUB_TOKEN` from the environment. It is not enough
to put the value in a file if the process was started by a command that does
not load that file. Export it in the same terminal that starts the backend.
The token needs repository creation/push access and workflow permission for
the generated `.github/workflows/ci.yml`. See
[GitHub integration](github-integration.md).

If the form's `RepoUrlPicker` cannot validate a repository, check the GitHub
host/owner/repository fields and token access before submitting the task.

### The task publishes but Catalog registration fails

Check the Scaffolder task event log in Backstage. The generated repository must
contain `catalog-info.yaml`, and its owner must be a valid catalog group. The
template's final step registers that file after `publish:github`; a successful
GitHub repository creation does not by itself prove Catalog registration.

### A capability selection appears to do nothing

Selections have three different effects:

- `notifications`, `i18n`, and `observability` add infrastructure modules at
  their documented extension points.
- Authentication, Profile, Permission/RBAC, Dashboard, Settings, Reports,
  History, and Audit Log add real frontend Feature Pack routes, navigation,
  screens, interactions, and focused tests. Their typed frontend/data
  boundaries still need real providers or product services.
- `tenant`, `desktop-ready`, and `mobile-ready` are recorded only in
  `platform-app.json`; `theme` is an always-on `@platform/ui` foundation and
  is not a meaningful toggle.

Feature Pack dependencies are validated before publication: Profile and RBAC
require Authentication, and Audit Log requires both Authentication and RBAC.
This validation selects the required frontend packs; it does not create an
identity provider, authorization backend, or audit data service.

## Generated application

### `npm ci` fails in a generated repository

Use Node `>=22.12` as declared by the generated `package.json`, and run the
install from the generated repository root. `npm ci` requires the committed
`package-lock.json` to match `package.json`; do not delete or hand-edit the
lockfile. If a platform tarball was changed, regenerate the app or update the
tarball and lockfile together through the platform contribution workflow.

### The generated app shows “Platform host required”

The app was generated with `mode: "platform-mfe"`, but no compatible host was
provided. For standalone local development, regenerate with `standalone` or
`standalone-and-mfe`, or provide the versioned host contract in the environment
that launches the app. This is a runtime-mode contract, not an API failure.

### API cards show network errors

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to a reachable
backend. The generated `/health` call is an illustrative API boundary; this
repository does not generate a domain backend. Check the backend's CORS policy,
the browser Network tab, and the normalized `ApiError` details.

### Generated CI fails before the build

The workflow uses Node 22, installs the npm version declared in
`packageManager` (`npm@10.9.3` in the current skeleton), verifies that version,
then runs `npm ci`. A package-lock drift or a dependency change without a
committed lockfile is the usual cause. The workflow then runs lint, typecheck,
unit tests, build, and Playwright E2E.

## Design System Portal

### Portal does not reflect a source change

Run `node .yarn/releases/yarn-4.13.0.cjs dev:portal` from the platform-control-
plane root. The portal aliases `@platform/ui` to `packages/platform-ui/src`,
so inspect the source tree and restart Storybook if its Vite cache is stale.
Use `build:portal` to catch production Storybook issues.

### A desired Feature Pack is not visible in the portal

The Application features story is a reserved review boundary. A feature is not
selectable in App Factory until its important UX states can be reviewed in the
portal and its composition/provider contract is implemented. Keep product-only
UX in the generated application.

## PostgreSQL, Windows, and WSL

- PostgreSQL is optional for the default local boot. If using Docker Compose,
  run `docker compose up -d`, wait for the health check, copy
  `app-config.local.yaml.example` to `app-config.local.yaml`, and export the
  `POSTGRES_*` variables before starting the backend.
- Backstage does not automatically load `.env` for the two-process workflow.
  Export variables in the shell that launches each process. The root combined
  `start` script uses `dotenv`, but it is not the recommended Windows path.
- In WSL, keep Node, Yarn, `node_modules`, and generated-app installs inside
  the same environment. Do not share a Windows-built `node_modules` directory
  with WSL; native modules such as `better-sqlite3` can fail with an ABI error.
- On Windows, `core.autocrlf=true` can make `identityProvisioning.test.ts`
  report a byte-for-byte mismatch for `examples/org.provisioned.yaml` even when
  its content is correct. Run that validation in WSL/Linux, or normalize the
  fixture only for the check and restore its original line endings; do not commit
  a line-ending-only rewrite.
- Use POSIX paths and `curl` in WSL; use `curl.exe` and PowerShell environment
  variables in Windows PowerShell. The service URLs and repository commands are
  otherwise the same.
