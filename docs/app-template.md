# App Factory guide

The Backstage App Factory is the **Platform MFE Application** software
template at `templates/platform-mfe-app/template.yaml`. It creates a GitHub
repository from the controlled skeleton, then registers the new repository in
the Backstage Catalog.

## Before you start

- Start the Backstage frontend and backend as described in
  [Getting started](getting-started.md).
- Sign in with Guest locally.
- Export `GITHUB_TOKEN` in the backend terminal for repository availability
  checks and the final publish step. The token must be allowed to create/push
  the selected repository and the generated workflow.
- Choose an owner that exists in the Backstage Catalog, normally
  `group:default/platform-team` for local development.

## Creation flow

1. Open <http://localhost:3000>.
2. Choose **Enter**, then **Create**.
3. Select **Platform MFE Application**.
4. Complete the four form sections below.
5. Submit and follow the task output to the GitHub repository and Catalog
   entity.

The template uses only Backstage built-in actions:

```text
fetch:template -> fs:delete -> publish:github -> catalog:register
```

`fs:delete` removes unselected composed capability directories after the
skeleton is rendered. It does not add product behavior or install packages.

## Form fields

| Section              | Field            | Current behavior                                                                                                                  |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Application identity | `name`           | Required URL-safe slug, also used as repository/catalog component name; lowercase letters, digits, and hyphens; max 63 characters |
| Application identity | `title`          | Required human-readable display title                                                                                             |
| Application identity | `description`    | Optional product description; rendered into the repository metadata and README                                                    |
| Application identity | `owner`          | Required Backstage `OwnerPicker`, filtered to Groups                                                                              |
| Repository           | `repoUrl`        | Required `RepoUrlPicker`; `github.com` is the only allowed host                                                                   |
| Repository           | `repoVisibility` | Required `private` or `public`; default is `private`                                                                              |
| Application metadata | `lifecycle`      | Required `experimental` or `production`; default is `experimental`                                                                |
| Application metadata | `mode`           | Required `platform-mfe`, `standalone`, or `standalone-and-mfe`; default is `platform-mfe`                                         |
| Capabilities         | `capabilities`   | Optional unique selection from the closed list in the Feature Pack guide                                                          |

The default branch is always `main`; it is not a form field.

## Runtime mode

The selected `mode` is written to `platform-app.json` and is used by the
generated app at boot:

| Mode                 | No host                                         | Compatible host                        |
| -------------------- | ----------------------------------------------- | -------------------------------------- |
| `standalone`         | Runs standalone                                 | Still runs standalone; host is ignored |
| `platform-mfe`       | Shows a clear “Platform host required” fallback | Runs hosted and uses host adapters     |
| `standalone-and-mfe` | Runs standalone                                 | Runs hosted and uses host adapters     |

The host contract is implemented by the SDK resolver, but this repository does
not ship a Super App or Module Federation runtime. Every generated
`platform-app.json` therefore records:

```json
"runtime": { "type": "module-federation", "status": "not-configured" }
```

That field is metadata for the future runtime boundary; it does not mean that
Module Federation is installed.

## Generated output

The repository contains:

- `package.json` with Vite, React, TypeScript, router/query/table/form tools,
  and the generated validation scripts;
- `package-lock.json` for deterministic `npm ci` installation;
- `src/` with routes, layout baseline, API transport, platform adapters,
  examples, tests, and only the selected composed capability modules;
- vendored `@platform/ui` and `@platform/sdk` tarballs under `vendor/`;
- `platform-app.json` containing identity, mode, owner, and exact capability
  selections;
- `catalog-info.yaml` linking the application to the `application-platform`
  system;
- `.github/workflows/ci.yml` and a README with the generated commands;
- `.env.example` with `VITE_API_BASE_URL` and `VITE_APP_TITLE`.

The generated app has no backend. Its `/health` example demonstrates the API
boundary and fails gracefully when no service is running.

## Generated CI expectations

The generated workflow runs on pushes and pull requests to `main`. It uses
Node 22, installs and verifies the npm version declared in `packageManager`,
runs frozen `npm ci`, and then runs:

```text
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The workflow installs Chromium for the Playwright suite. When dependencies
change, update `package.json` and the committed lockfile together; generated CI
is deliberately not allowed to resolve a different tree.

## After generation

From the new repository root:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Use `standalone` or `standalone-and-mfe` while developing locally unless a
compatible host is already available. Then read
[Business-domain development](business-domain-development.md) for the product
ownership boundary and [Backend integration boundaries](backend-integration.md)
for real providers and APIs.

## What is composed versus recorded

The generated README lists the selected values. The exact rules and current
status are maintained in [capabilities.md](capabilities.md); do not infer
that a recorded selection creates a page, endpoint, provider, or backend.
