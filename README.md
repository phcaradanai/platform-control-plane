# Frontend Standard Platform

This repository is the Backstage control plane and App Factory for the
frontend standard platform. It gives product teams a repeatable starting point
for React applications through two shared packages:

- `@platform/ui` — semantic theme tokens, accessible UI primitives, feedback
  states, and the Design System Portal.
- `@platform/sdk` — the stable application identity, runtime, navigation,
  authentication, permissions, and tenant contracts.

The control plane is not the product application runtime. It hosts the
catalog, the App Factory form, and the backend actions that create and register
generated application repositories. The generated application owns its
business domain and consumes the shared packages.

## Start here

Read the guides in this order if you are new to the platform:

1. [Platform overview](docs/platform-overview.md) — what the platform is and
   what each repository surface owns.
2. [Architecture](docs/architecture.md) — how the control plane, shared
   packages, App Factory, generated application, and providers fit together.
3. [Getting started](docs/getting-started.md) — install and run Backstage,
   verify the backend, and open the portal.
4. [App Factory guide](docs/app-template.md) — fill in the current template,
   understand runtime modes, and know what is generated.
5. [Feature Pack guide](docs/capabilities.md) — distinguish code that is
   composed today from selections that are only recorded.
6. [Business-domain development](docs/business-domain-development.md) — where
   product implementation begins and which foundations must not be recreated.
7. [Backend integration boundaries](docs/backend-integration.md) — connect
   real APIs and providers without treating frontend UX as an authority.

The remaining guides cover the [Design System Portal](docs/design-system-portal.md),
[platform contributions](docs/platform-contribution.md),
[troubleshooting](docs/troubleshooting.md), and the
[current platform status](docs/status.md).

## Quick start

From the repository root, use the vendored Yarn release so the command is
consistent across shells and operating systems:

```bash
node .yarn/releases/yarn-4.13.0.cjs install --immutable
```

Start the control plane in two terminals. This is the reliable workflow on
Windows and also works on macOS, Linux, and WSL:

```bash
# terminal 1 — Backstage backend, http://localhost:7007
node .yarn/releases/yarn-4.13.0.cjs dev:backend

# terminal 2 — Backstage frontend, http://localhost:3000
node .yarn/releases/yarn-4.13.0.cjs dev:app
```

Local development uses the guest provider and an in-memory SQLite database by
default. A GitHub token is not required to boot the platform, but it is
required to publish a repository from App Factory. See
[GitHub integration](docs/github-integration.md).

Open <http://localhost:3000>, choose **Enter**, then use **Catalog** or
**Create**. To inspect the shared UX standard, run:

```bash
node .yarn/releases/yarn-4.13.0.cjs dev:portal
```

Then open <http://127.0.0.1:6006>.

## Validation

The repository CI contract is:

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all
node .yarn/releases/yarn-4.13.0.cjs build:portal
docker compose config --quiet
node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
```

The smoke suite starts the Backstage backend and frontend through the
Playwright configuration and covers guest sign-in, Catalog, and the App
Factory form. A live publish still needs a GitHub token and a real repository
destination.

## Current boundary

Stable frontend standards today include `@platform/ui`, `@platform/sdk`, the
source-backed portal, the Backstage App Factory, the generated React/Vite
foundation, and generated CI. The current template dynamically composes only
`notifications`, `i18n`, and `observability`; other capability selections are
recorded in `platform-app.json` and do not install feature code. The SDK
contains adapter contracts for optional authentication, permissions, and
tenant providers, but the generated app has no real provider by default.

Real identity-provider integration for generated applications, tenant
infrastructure, report/history/audit data services, a host runtime or Module
Federation, and deployment infrastructure are outside the current supported
standard. See [Current platform status](docs/status.md) before treating a
selection or contract as shipped behavior.

## Repository documentation

The complete navigation is in [docs/README](docs/README.md). Reference guides
for the Backstage catalog, operator identity, GitHub integration, and the SDK
are linked there. Phase reports and ADRs are historical evidence, not the
golden path; follow the current guides first.
