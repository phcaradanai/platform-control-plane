# ADR 0006: Frontend Feature Pack Composition

## Status

Accepted for Phase 5.5B2.

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
- explicit dependency and replacement-boundary metadata.

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
- No optional pack adds a new dependency; all use the base skeleton's shared
  packages.
- The committed route tree is templated per selection so generated apps can
  typecheck before their first build; the TanStack Router plugin regenerates it
  from the pruned route files during build.
- Authentication, RBAC, tenant, and domain data remain explicit future
  contracts. No fake security behavior is introduced.
- A future pack that needs a backend can define a frontend contract first and
  add the backend in a separate phase rather than hiding it in sample UI.

## Rejected alternatives

1. A second global runtime feature registry: rejected because it would split
   ownership from the existing scaffolder composition path.
2. Conditional npm installation/lockfiles: rejected because generation must
   remain deterministic and frozen CI must not run arbitrary package install
   logic per selection.
3. A fixed all-features shell: rejected because unselected features must leave
   no dead route, import, or navigation entry.
