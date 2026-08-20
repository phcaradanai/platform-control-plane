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
- A provider-neutral generated-app authentication path: the SDK's OIDC
  Authorization Code + PKCE adapter supports configured public browser
  clients, bearer API transport, SSO restore, refresh, expiry, and sign-out;
  a compatible host adapter remains supported.
- Dynamic generation for the infrastructure capabilities `notifications`,
  `i18n`, and `observability`. A selected module is wired into the generated
  app; an unselected module is pruned.
- Eight frontend Feature Packs — Authentication, Profile, Permission/RBAC,
  Dashboard, Settings, Reports, History, and Audit Log. A selected pack is
  rendered and pruned as real generated frontend code with its route,
  navigation, screen, interactions, focused tests, and typed frontend/data
  boundary. Profile and RBAC require Authentication; Audit Log requires both
  Authentication and RBAC.
- The `theme` foundation is always on. `tenant`, `desktop-ready`, and
  `mobile-ready` remain recorded-only selections.

## Integration boundaries

These contracts or configurations exist, but require a real provider or
service before they provide production capability:

- `AuthAdapter` / `useAuth()` use the generated OIDC adapter when public OIDC
  configuration is supplied, or a compatible platform host when hosted.
  Standalone mode without either reports `unavailable`; the backend remains
  authoritative for token validation and authorization.
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

- A platform-owned identity-provider service, enterprise SSO deployment, or
  Keycloak realm/client provisioning. Generated apps integrate with a
  deployment-provided OIDC issuer; this repository does not operate that IdP.
- Tenant backend and resource-scoped authorization enforcement for products.
- Provider/backend services behind the shipped packs: profile persistence,
  dashboard/settings/report/history data services, audit persistence and
  immutability, and compliance guarantees.
- A Super App/host runtime, Module Federation loading, or deployment/runtime
  platform.

The [Feature Pack guide](capabilities.md) lists each current identifier and
its exact status. The [Backend integration boundaries](backend-integration.md)
guide explains how to connect real systems without moving their authority into
the frontend.
