# Business-domain development guide

App Factory gives a product team a working application foundation. After
generation, the product team should spend its time on business behavior and
domain UX, not rebuild generic platform plumbing.

## Where product work begins

Use the generated repository's existing structure:

```text
src/
  api/              typed API transport and domain endpoint modules
  features/         business-domain features and reusable product sections
  routes/           product pages and route composition
  components/       product layout extensions and product-specific UI
  lib/              product/runtime adapters and small domain utilities
```

Typical first changes are:

- add a domain API module under `src/api/` with types and query/mutation hooks;
- add a domain feature under `src/features/<domain>/`;
- add a route under `src/routes/` and navigation content in the existing shell;
- add product-specific forms, workflows, statuses, and copy;
- connect the feature to the product backend through `VITE_API_BASE_URL`.

Keep network calls behind `src/api/client.ts`. It centralizes the base URL,
JSON handling, timeout behavior, cancellation, and normalized `ApiError`
shape. Components and query hooks should not call `fetch` directly.

For data views, use `@platform/ui` primitives and `QueryBoundary` for loading,
empty, error, and not-found states. Use the generated form example as the
starting shape for React Hook Form and Zod validation. The product owns the
meaning of the data, labels, columns, recovery actions, and workflow rules.

## Do not recreate platform foundations

Do not make a second local implementation of:

- shared UI primitives or Radix wrappers;
- semantic theme tokens, `ThemeProvider`, `ThemeToggle`, or `theme.css`;
- canonical loading, empty, error, not-found, toast, confirmation, dialog, or
  sheet behavior;
- generic form/table interaction patterns and accessibility behavior already
  provided by `@platform/ui`;
- an application-wide authentication UX or permission architecture; consume the
  SDK contracts and provider states instead;
- SDK identity, runtime, navigation, authentication, permissions, or tenant
  contracts;
- an additional shell or navigation overlay when the generated shell can be
  extended.

The current repository ships neutral frontend Feature Packs for
Authentication, Profile, Permission/RBAC, Dashboard, Settings, Reports,
History, and Audit Log when they are selected. They provide routes, screens,
interactions, tests, and replaceable frontend/data boundaries; they do not
provide production providers, persistence, authorization enforcement, or
compliance. Use a selected pack as the frontend starting point and replace its
illustrative data source through the product API boundary. Do not create a
parallel platform-shaped framework for those concerns inside a product. If a
product needs different domain semantics or did not select a pack, implement
the domain-specific page and API in the generated application; if several
products need the same neutral contract, propose it to the platform team
instead of silently copying a framework.

The generated `src/components/layout` code is application-owned baseline
layout, because the current platform intentionally does not prescribe one
universal product shell. Extend that baseline for product navigation; do not
fork it into multiple competing shells in the same application. If several
products need the same behavior and it is genuinely product-agnostic, propose
it to the platform team instead of copying it again.

## Ownership checklist

| Concern                 | Product owns                                                   | Platform owns                                                                                       |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Business logic          | Domain rules, calculations, workflows                          | No product rules                                                                                    |
| APIs                    | Domain endpoints, DTOs, query keys, backend integration        | Generic request/error transport                                                                     |
| Pages                   | Domain routes and information architecture                     | Shared primitives and patterns                                                                      |
| UX                      | Domain content, states, approvals, exports, and task flow      | Interaction/accessibility behavior of shared components                                             |
| Auth and permissions    | Requesting the required provider contracts and handling states | SDK shape and safe unavailable/fail-closed defaults                                                 |
| Audit/history/reporting | Product semantics and real service integration                 | Neutral Feature Pack UX/data boundaries; no backend authority, persistence, or compliance guarantee |

## Extending the generated application safely

1. Read the generated README and `platform-app.json` before changing the
   scaffold.
2. Inspect the [Design System Portal](design-system-portal.md) before adding
   new controls or state patterns.
3. Add domain code under `src/` and use the existing API, query, routing, and
   UI conventions.
4. Keep product-specific data out of `@platform/ui` and `@platform/sdk`.
5. Add unit/component coverage for domain behavior and a Playwright check for
   important user journeys.
6. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run
build`, and `npm run test:e2e` before opening a pull request.

If the change is a reusable platform capability rather than domain behavior,
stop and follow the [Platform Contribution Guide](platform-contribution.md).
