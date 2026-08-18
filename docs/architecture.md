# Architecture

The platform has a control-plane path for creating applications and a
generated-application path for running product code.

```text
Developer
   │
   ▼
Backstage frontend (Catalog / Create)
   │  authenticated API calls
   ▼
Backstage backend (Catalog / Scaffolder / permissions)
   │
   ├── render templates/platform-mfe-app/skeleton
   ├── publish:github ───────────────► GitHub repository
   └── catalog:register ─────────────► Backstage Catalog

Generated repository
   ├── product routes, features, and API clients
   ├── @platform/ui ─────────────────► shared UX foundation
   └── @platform/sdk ────────────────► provider/runtime contracts
                                           │
                                           ├── standalone defaults
                                           └── future host/provider adapters
```

## Repository map

- `packages/app` is the Backstage frontend. Its current app composition
  includes Catalog, navigation, sign-in, and the backend-readiness banner.
- `packages/backend` is the Backstage backend. It registers Catalog,
  Scaffolder, Auth, Permissions, Search, TechDocs, Kubernetes, Notifications,
  Signals, and related Backstage modules.
- `packages/platform-ui` is the source of `@platform/ui`. Its Storybook
  stories are the Design System Portal source of truth.
- `packages/platform-sdk` is the source of `@platform/sdk`. It defines
  hooks, types, adapters, standalone behavior, and the optional host contract.
- `templates/platform-mfe-app/template.yaml` is the App Factory contract. The
  skeleton beside it is rendered into each new repository.
- `packages/template-validation` tests the template, catalog model, config,
  capability composition, vendored packages, and related invariants.

## Ownership boundaries

### Platform-owned

The platform owns shared tokens and UI primitives, canonical loading/empty/
error/not-found feedback, theme behavior, accessibility behavior inside those
primitives, SDK contracts, the App Factory skeleton, and the generated CI
baseline.

### Application-owned

The generated application owns its routes, navigation content, domain API
types and queries, domain pages, workflows, data presentation, copy, and
product-specific decisions. Its generated `src/components/layout` is a
baseline application shell that the product may extend; it is not a promise
that the platform currently provides one universal shell component.

### Provider/backend-owned

Identity proof, authorization enforcement, persistence, report data,
history/event data, audit integrity, tenant resolution, compliance, and
deployment/runtime hosting belong to real providers and services. Frontend
components may represent their state but cannot establish those guarantees.

## Runtime and composition boundary

`platform-app.json.mode` is the scaffold-time choice (`platform-mfe`,
`standalone`, or `standalone-and-mfe`). The generated app resolves it against
the optional `window.__PLATFORM_HOST__` contract at boot:

- `standalone` always runs standalone.
- `platform-mfe` requires a host and renders a clear fallback when none is
  present.
- `standalone-and-mfe` runs standalone without a host and uses host adapters
  when a compatible host is present.

The host contract and runtime resolver exist, but this repository does not
ship a Super App or Module Federation host. `platform-app.json` records
`runtime.status: "not-configured"` for that reason.

At generation time, the template conditionally wires the three independent
infrastructure capability modules (`notifications`, `i18n`, and
`observability`) and the eight frontend Feature Packs. Infrastructure
capabilities mount into their documented extension points; a selected Feature
Pack adds its route, navigation, screen, interactions, tests, and frontend/data
boundary. Profile and RBAC require Authentication, while Audit Log requires
Authentication and RBAC; the App Factory schema and generated registry
validate those selections. The render-and-prune mechanism is deterministic and
does not change `package.json` or `package-lock.json` per selection.
