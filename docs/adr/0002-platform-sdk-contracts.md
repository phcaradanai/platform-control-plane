# ADR 0002: `@platform/sdk` as the stable platform-facing contract

## Status

Accepted (Phase 3)

## Context

Generated applications need a consistent way to ask the platform "who am
I," "who's signed in," "am I allowed to do this," "what tenant am I in,"
"navigate somewhere," and "am I running standalone or inside a future
Super App shell" - without each generated app inventing its own
conventions, and without coupling generated apps directly to Backstage
(the control plane) or to whatever eventually implements a Super App
runtime.

Per [ADR 0001](./0001-backstage-as-app-factory.md), this control plane
does not run generated applications or handle end-user auth/deployment.
Nothing in the repo today implements auth, permissions, tenancy, or
navigation for generated apps - the skeleton has zero code touching any
of these concerns. `template.yaml`'s curated capability enum already
includes `authentication`, `rbac`, and `tenant` as selectable checkboxes,
but selecting them is purely metadata recorded into `platform-app.json`;
no code, dependency, or scaffolding backs them.

## Decision

Introduce `packages/platform-sdk` (`@platform/sdk`), vendored into
generated apps the same way `@platform/ui` already is: built with `tsc`,
packed with `npm pack`, shipped as a tarball at
`templates/platform-mfe-app/skeleton/vendor/`, and pinned in the
skeleton's `package.json`/`package-lock.json`. It defines six React hook
contracts - `usePlatformApp`, `usePlatformRuntime`, `useNavigation`,
`useAuth`, `usePermissions`, `useTenant` - documented in
[`docs/platform-sdk.md`](../platform-sdk.md).

Every optional capability (auth, permissions, tenant, navigation) is
backed by a pluggable **adapter** interface. `PlatformProvider` defaults
every capability to a standalone implementation that either works with no
backend (navigation, via the browser History API) or reports
`status: 'unavailable'` and fails closed (auth, permissions, tenant - no
Keycloak/RBAC/tenant system exists to back them yet). This keeps the
contract stable and usable today while leaving an explicit seam for a
future platform-hosted shell to supply real adapters, without generated
app code needing to change when that happens.

## Why a separate package instead of extending `@platform/ui`

`@platform/ui` is presentational (Radix primitives, design tokens) with
no notion of identity, auth, or navigation. Mixing platform-context
concerns into it would force every consumer of a button or dialog to also
pull in auth/tenant machinery, and would conflate "how things look" with
"how the app talks to the platform" - two concerns with different
stability expectations and different future owners (UI vs. platform
runtime).

## Why adapters instead of implementing real providers now

The spec for this phase explicitly excludes real Keycloak, an RBAC
backend, a tenant system, Module Federation, and Super App runtime
composition. Implementing fake versions of these (e.g. an SDK that always
reports "authenticated" in dev) would teach generated apps to depend on
behavior that doesn't reflect any real environment and would need to be
unwound later. Reporting `unavailable` and failing closed is the accurate
statement of what exists today, and the adapter interface is the
contract a future phase implements against rather than redesigns.

## Consequences

- Generated apps depend on `@platform/sdk`, not on Backstage identity
  APIs or any future Super App internals directly - the same decoupling
  `@platform/ui` already established for UI.
- `templates/platform-mfe-app/vendor-manifest.json` and
  `packages/template-validation/src/vendorFingerprint.ts` generalized from
  a single `@platform/ui` entry to a list, so both vendored packages get
  the same staleness guard; any future third vendored package follows the
  same pattern.
- A future phase implementing real auth/RBAC/tenant integrates by
  supplying `AuthAdapter`/`PermissionsAdapter`/`TenantAdapter`
  implementations to `PlatformProvider`, not by changing the hook
  contracts generated apps already call - the six hooks and their
  "ready"/"unavailable" shapes are the durable boundary.
- `usePermissions().can()` failing closed by default means any future
  real permissions provider must be explicit about grants; there is no
  "allow all" standalone default to accidentally ship to production (unlike
  the backend's `permission-backend-module-allow-all-policy`, which is
  documented in `CLAUDE.md` as a development-only placeholder that must
  not reach production).
