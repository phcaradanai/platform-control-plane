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

The `fs:delete` steps remove unselected composed infrastructure-capability
and frontend Feature Pack directories after the skeleton is rendered. They do
not add product behavior or install packages.

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
| Capabilities         | `capabilities`   | Optional unique multi-select from the closed 15-item list in the Feature Pack guide                                               |

The `capabilities` field is restricted to the curated identifiers documented
in [capabilities.md](capabilities.md). Every selection is recorded in
`platform-app.json`; the composed platform capabilities and frontend Feature
Packs also add generated code as described below.

The default branch is always `main`; it is not a form field.

## Capability selection

The closed enum in `template.yaml` contains the 15 curated identifiers
listed in the form-field table above. It has no free-text package or install
field. The eight frontend Feature Packs are composed into generated routes,
navigation, screens, interactions, and tests; the platform capabilities
`notifications`, `i18n`, and `observability` are composed into their
extension points. `tenant`, `desktop-ready`, and `mobile-ready` are recorded
only in `platform-app.json`; `theme` is an always-on foundation rather than a
meaningful toggle. See [capabilities.md](./capabilities.md) and
[feature-packs.md](./feature-packs.md).

## Runtime mode

The selected `mode` is written to `platform-app.json` and resolved at boot:

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

Unlike recorded capabilities, `mode` has real runtime meaning. The form's
default, `platform-mfe`, requires a platform host to boot at all. Since no
Super App shell exists yet, a freshly scaffolded app left at that default
shows a "Platform host required" screen on `npm run dev` until a host exists
or `platform-app.json` is changed to `standalone` or
`standalone-and-mfe`. See [platform-sdk.md](./platform-sdk.md#standalone-vs-hosted)
and [ADR 0005](./adr/0005-runtime-mode-boundary.md) for the boundary.

## Steps

```text
fetchBase           -> fetch:template   render templates/platform-mfe-app/skeleton
pruneCapabilities    -> fs:delete       remove unselected composed platform capabilities
pruneFeaturePacks    -> fs:delete       remove unselected feature-pack source and route files
publish              -> publish:github  create + push the GitHub repository (defaultBranch: main)
register             -> catalog:register register catalog-info.yaml in the new repo
```

All five are Backstage built-in actions; no custom scaffolder action was
implemented, per the spec's preference for built-ins.

`pruneCapabilities` (added in Phase 4) deletes
`src/capabilities/<id>/**` in the fetched working directory for each of
`notifications`, `i18n`, and `observability` that wasn't selected. The
following `pruneFeaturePacks` step removes both
`src/feature-packs/<id>/**` and `src/routes/<id>.tsx` for every unselected
frontend pack. See [capabilities.md](./capabilities.md)
and [feature-packs.md](./feature-packs.md) for the full composition model.

`fetchBase` passes `copyWithoutTemplating: ['.github/workflows/**']`.
Without this, the skeleton's `.github/workflows/ci.yml` would be run
through the same `${{ ... }}` template engine Backstage uses for
scaffolder expressions, which is the same delimiter GitHub Actions
expressions use - `${{ failure() }}` / `${{ github.repository }}` in the
workflow file would be evaluated against the scaffolder's context and
fail the render (`Unable to call 'failure', which is undefined or
falsey`) instead of being copied verbatim.

**Phase 1.1 finding:** the installed
`@backstage/plugin-scaffolder-backend` version's `fetch:template` action
handler only wires the _newer_ `copyWithoutTemplating` input into the
copy-without-rendering behavior - `copyWithoutRender` is still accepted by
the action's schema (so no validation error) but is silently a no-op. The
template originally used `copyWithoutRender`, which passed every hermetic
test in `packages/template-validation` (that test suite reimplements its
own copy-skip logic rather than exercising the real handler) but failed
the first real scaffolder task run against this backend version. Fixed by
switching to `copyWithoutTemplating`; the test suite's helper and
assertions were renamed to match.

## What gets generated

```text
README.md
package.json
tsconfig.json
src/index.ts
catalog-info.yaml
platform-app.json
.env.example
.gitignore
.github/workflows/ci.yml
```

`platform-app.json` records the exact form selections in the shape
required by the spec:

```json
"runtime": { "type": "module-federation", "status": "not-configured" }
```

That field is metadata for the future runtime boundary; it does not mean that
Module Federation is installed.

## Generated output

`runtime.status` is always `not-configured` - no Module Federation runtime
is installed or wired up by this phase. The independent infrastructure
capabilities `notifications`, `i18n`, and `observability` are composed into
`src/capabilities/` when selected, while the eight current frontend Feature
Packs are composed into `src/feature-packs/` (see
[capabilities.md](./capabilities.md) and [feature-packs.md](./feature-packs.md));
`tenant`, `desktop-ready`, and `mobile-ready` remain recorded only. `theme` is
an always-on foundation. The generated README explicitly lists what was
generated, which requested
capabilities are composed versus recorded only, how to run validation
(`npm ci && npm run typecheck && npm run build`), and that Module
Federation integration is a later phase.

The repository contains:

- `package.json` with Vite, React, TypeScript, router/query/table/form tools,
  and the generated validation scripts;
- `package-lock.json` for deterministic `npm ci` installation;
- `src/` with routes, layout baseline, API transport, platform adapters,
  examples, tests, and only the selected infrastructure capability and
  frontend Feature Pack modules;
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
