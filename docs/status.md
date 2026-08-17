# Current platform status

This page is the boundary between supported behavior, integration contracts,
and future platform work. It is intentionally more authoritative than older
phase reports.

## Stable frontend standard

Supported and verified on the current `main` implementation:

- `@platform/ui` with semantic light/dark/system theme behavior, Radix-based
  accessible primitives, feedback states, and shared UnoCSS configuration.
- The source-backed Design System Portal for inspecting foundations, patterns,
  responsive behavior, themes, and accessibility states.
- `@platform/sdk` application identity, runtime information, router-agnostic
  navigation, optional capability contracts, standalone defaults, and the
  versioned platform-host boundary.
- The Backstage control plane with Catalog, local Guest sign-in, operator
  permission policy, the Platform MFE Application template, GitHub publishing,
  and catalog registration.
- A generated React 19/Vite 8/TypeScript application foundation with typed API
  transport, TanStack Router/Query/Table/Virtual, React Hook Form/Zod,
  vendored `@platform/ui` and `@platform/sdk`, unit tests, Playwright tests,
  and generated GitHub Actions CI.
- Dynamic generation for `notifications`, `i18n`, and `observability`. A
  selected module is wired into the generated app; an unselected module is
  pruned.

## Integration boundaries

These contracts or configurations exist, but require a real provider or
service before they provide production capability:

- `AuthAdapter` / `useAuth()` require an identity provider or a compatible
  platform host. Standalone mode reports `unavailable`.
- `PermissionsAdapter` / `usePermissions()` require an authorization provider.
  Standalone mode fails closed: `can()` returns `false`.
- `TenantAdapter` / `useTenant()` require tenant infrastructure.
- The generated API client and `VITE_API_BASE_URL` provide transport and error
  normalization; the repository does not generate a business backend.
- The control plane can use GitHub PAT integration for App Factory publishing,
  and its production config describes GitHub OAuth for operator sign-in. These
  are control-plane concerns, not generated-app end-user authentication.
- PostgreSQL configuration and Docker Compose are available for local or
  deployment preparation; deployment infrastructure is not included.

## Future platform work

Not shipped by this repository today:

- A real identity provider for generated applications, enterprise SSO, or
  Keycloak integration.
- A generated-app profile, settings, dashboard, reports, history, or audit-log
  Feature Pack with platform-owned data-source contracts. The App Factory enum
  records several of those requests, but selection alone does not install them.
- Tenant backend and resource-scoped authorization enforcement for products.
- Report, history, and audit services or compliance guarantees.
- A Super App/host runtime, Module Federation loading, or deployment/runtime
  platform.

The [Feature Pack guide](capabilities.md) lists each current identifier and
its exact status. The [Backend integration boundaries](backend-integration.md)
guide explains how to connect real systems without moving their authority into
the frontend.
