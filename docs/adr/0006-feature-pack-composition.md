# ADR 0006: Frontend Feature Pack Composition

> **Historical record — see current documentation.** This ADR captures the
> decision and implementation boundary of its phase. For present behavior,
> read [Current platform status](../status.md), [Feature Pack guide](../capabilities.md),
> and [Frontend feature packs](../feature-packs.md).

## Status

Accepted for Phase 5.5B2.

> **Historical decision record:** This ADR preserves the decision and platform
> state of its phase. For present behavior, follow [Current platform status](../status.md),
> the [Feature Pack guide](../capabilities.md), and the [App Factory guide](../app-template.md).

## Decision

Evolve the Phase 4 capability composition mechanism into a frontend Feature
Pack model without introducing a second runtime registry or dependency system.

The App Factory continues to use the closed `capabilities` selection field.
Frontend packs live under the generated application's
`src/feature-packs/<id>/` directory and implement the small `FeaturePack`
contract. A selected pack contributes:

- a route module;
- a navigation contribution consumed by the standard `@platform/ui`
  `ApplicationShell`;
- a screen composed from shared application patterns;
- neutral states/interactions and focused tests;
- explicit platform-only dependency and replacement-boundary metadata.

The template's Nunjucks guards render only selected registry and route-tree
entries. A single `fs:delete` step removes unselected pack directories and
route files. This is the same deterministic render-and-prune mechanism used
for the existing `notifications`, `i18n`, and `observability` capabilities.

## Context

Phase 4 proved that capability selection can produce generated code, but its
composed capabilities were infrastructure integrations mounted into existing
extension points. Feature packs need to own screens and routes while remaining
frontend-first and backend-neutral. The frozen generated `package-lock.json`
also means selection cannot introduce arbitrary per-pack npm dependencies.

## Consequences

- Dashboard and Settings are real generated features, not metadata or empty
  placeholder routes.
- Reports, History, and Audit Log are real generated operational-data features.
  Their typed data-source contracts are frontend boundaries only; sample
  sources are illustrative and replaceable by API adapters.
- Authentication, Profile, and Permission/RBAC are real frontend-first packs.
  Authentication owns session UX and a provider-neutral sign-in route;
  Profile and Permission/RBAC explicitly depend on Authentication and use the
  existing `@platform/sdk` adapter contracts.
- No optional pack adds a new dependency; `dependencies` accepts only the
  explicitly allowlisted `@platform/ui` and `@platform/sdk` identifiers
  already provided by the base skeleton.
  The App Factory does not run pack-controlled installs or vary the lockfile.
  At the time of this decision, pack-to-pack dependencies were not implicit
  and required a future explicit selection contract. The current implementation
  now declares and validates Profile -> Authentication, RBAC -> Authentication,
  and Audit Log -> Authentication + RBAC; see the current Feature Pack guide.
- The committed route tree is templated per selection so generated apps can
  typecheck before their first build; the TanStack Router plugin regenerates it
  from the pruned route files during build.
- Authentication providers, backend authorization, tenant, audit persistence,
  reporting, event storage, and domain data
  remain explicit runtime contracts. No fake security behavior is introduced:
  the new packs can render signed-out, unavailable, and denied UX, but API
  authorization remains authoritative.
- A future pack that needs a backend can define a frontend contract first and
  add the backend in a separate phase rather than hiding it in sample UI.
- Pack labels and sample copy remain translation-library-neutral. The optional
  `i18n` capability localizes platform shell labels when selected, while a
  product owns localization/replacement of pack screen copy.

## Rejected alternatives

1. A second global runtime feature registry: rejected because it would split
   ownership from the existing scaffolder composition path.
2. Conditional npm installation/lockfiles: rejected because generation must
   remain deterministic and frozen CI must not run arbitrary package install
   logic per selection.
3. A fixed all-features shell: rejected because unselected features must leave
   no dead route, import, or navigation entry.
