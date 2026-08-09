# ADR 0003: Real identity and access for the control plane

## Status

Accepted (Phase 3.1)

## Context

Since Phase 1, this Backstage instance has run with guest-only sign-in and
`permission-backend-module-allow-all-policy` - a placeholder explicitly
flagged in `CLAUDE.md` and `docs/getting-started.md`'s "Known
limitations" as unsafe for production. There was no way to distinguish a
Platform Admin from a Developer, and no protection on Catalog, Scaffolder,
or platform-management actions beyond "anyone who can reach the backend
can do anything."

The control plane already had the building blocks for real sign-in:
`@backstage/plugin-auth-backend-module-github-provider` has been
registered since Phase 1 (inert until `auth.providers.github` is
configured - see `docs/github-integration.md`), and `integrations.github`
already establishes GitHub as this instance's identity source of record
for repository access. There was no need to introduce a new IdP.

## Decision

1. **GitHub OAuth as the real sign-in path.** No new provider - just
   actually configuring the already-registered module, with a resolver
   that requires a matching catalog `User` entity
   (`usernameMatchingUserEntityName`, no
   `dangerouslyAllowSignInWithoutUserInCatalog`) in production. Guest
   stays available for local development only, and is explicitly removed
   (`null`, not just omitted) from the merged production config.
2. **Two roles via catalog group membership**, enforced by a new
   `PlatformAccessPolicy` (`packages/backend/src/permissions/policy.ts`)
   replacing the allow-all module: `group:default/platform-admins` gets
   everything, any other signed-in user gets an explicit allow-list
   covering exactly the Catalog and Scaffolder actions the App Factory's
   create flow needs, and everything else is denied by default.
3. **No conditional (resource-scoped) permission rules.** Every decision
   is a definitive ALLOW or DENY. The task scope explicitly calls for
   avoiding unnecessary role/permission complexity, and nothing in the
   App Factory's actual usage needs per-entity conditions (e.g. "can only
   edit entities you own") - that's a real feature with real design
   questions, not a default to reach for.

See `docs/identity-and-access.md` for the full model, how to add an
admin, and what was verified.

## Why deny-by-default instead of an admin-only deny-list

An allow-list is a small, auditable set (11 permissions) that maps
directly to "browse the catalog, run a template, have it registered" -
the App Factory's actual golden path. A deny-list would require
enumerating every dangerous permission across every installed plugin
(catalog, scaffolder, kubernetes, notifications, etc.) and staying
current as plugins are added - the same enumeration problem
`@platform/sdk`'s fail-closed adapters were designed to avoid (see
[ADR 0002](./0002-platform-sdk-contracts.md)'s "why adapters" reasoning).
Anything not explicitly reasoned about defaults to denied, not allowed.

## Why this doesn't gate "Developer" on `platform-team` membership too

In production, GitHub sign-in itself already requires a matching catalog
`User` entity to exist - there is no way to be signed in without already
being a provisioned identity. A second membership check on top of that
would be redundant in this phase; if a future phase needs finer-grained
developer tiers than "signed in vs. platform-admin," that's a new,
deliberate decision, not something this ADR presupposes.

## Consequences

- `permission-backend-module-allow-all-policy` is removed as a
  dependency; `CLAUDE.md`'s architecture section is updated accordingly.
- Backend package gains direct dependencies on
  `@backstage/plugin-catalog-common` and `@backstage/plugin-scaffolder-common`
  (for their `/alpha` permission constants) and `@backstage/backend-plugin-api`
  (for `createBackendModule`/`coreServices`, used directly for the first
  time in this repo).
- `examples/org.yaml` gains a `platform-admins` Group, empty by default -
  nobody is an admin until a `User` entity opts in. This follows the same
  "clearly marked placeholder, not real org data" pattern
  `docs/catalog-model.md` already documents for `platform-team`.
- This is entirely separate from `@platform/sdk`'s `useAuth()` /
  `usePermissions()` contract for generated apps (see
  `docs/identity-and-access.md`'s "Not the same identity as generated
  apps") - no code or types are shared between the two, by design.
- Real Keycloak/enterprise IdP integration, a tenant system, and
  conditional/resource-scoped permission rules remain out of scope for
  this phase, same as ADR 0002's exclusions for `@platform/sdk`.
