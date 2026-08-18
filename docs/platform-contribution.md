# Platform contribution guide

Platform work is work that should be reusable across unrelated applications.
Product-domain code belongs in the generated application. When the boundary
is unclear, start with product code and promote only after there is evidence
that the behavior is stable, neutral, and needed more than once.

## Before changing the platform

1. Review the [Design System Portal](design-system-portal.md) and the existing
   `@platform/ui` exports.
2. Check the [frontend standards](frontend-standards.md) and the
   [Feature Pack guide](capabilities.md).
3. Decide whether the change is a UI primitive, an SDK contract, a composed
   capability, or documentation. Do not combine a product feature with an
   unrelated platform redesign.
4. State the ownership boundary and the provider/backend assumptions in the
   pull request.

## Reusable UI

A candidate for `@platform/ui` should be product-agnostic and should either
encode non-obvious accessible interaction behavior or fill a documented
platform standard. Add it to the package source, export it from
`packages/platform-ui/src/index.ts`, and add source-backed Storybook stories
under `packages/platform-ui/src/catalog`.

Every shared interaction should be reviewed in light and dark themes, narrow
and wide viewports, keyboard/focus states, loading/pending states, empty/error
states, and the accessibility addon. Add focused tests when the behavior is
not obvious from the primitive.

Validate the package and portal:

```bash
node .yarn/releases/yarn-4.13.0.cjs workspace @platform/ui typecheck
node .yarn/releases/yarn-4.13.0.cjs workspace @platform/ui build
node .yarn/releases/yarn-4.13.0.cjs build:portal
```

## SDK contracts

Changes to `@platform/sdk` must preserve the consumer-facing hook/type
contract, define safe standalone behavior, and include tests for unavailable,
ready, and subscription behavior where applicable. Optional capabilities must
not silently become available with fake data. Authentication and permissions
must fail safely when no provider is present.

After changing the SDK, rebuild and re-vendor the package before template
validation:

1. Build and pack `packages/platform-sdk`.
2. Replace `templates/platform-mfe-app/skeleton/vendor/platform-sdk-*.tgz`.
3. Regenerate the skeleton `package-lock.json` so the file dependency hash is
   current.
4. Update `templates/platform-mfe-app/vendor-manifest.json`'s source
   fingerprint.
5. Run template validation and generate/verify an app.

The same vendoring steps apply to `@platform/ui`. The committed tarballs are
what a generated repository consumes; changing only the monorepo source does
not change an already generated application.

## Adding a composed Feature Pack

Only add a Feature Pack when its important UX states are reviewable in the
portal and its composition contract is explicit. The current implementation
requires a composed pack to:

- be self-contained under `src/feature-packs/<id>/`;
- use existing dependencies and the frozen generated lockfile;
- own an explicit route, navigation contribution, screen, and frontend
  contract in the generated app;
- be conditionally wired in the feature-pack registry and route tree, then
  pruned when unselected;
- have independent tests and no dangling imports when omitted;
- be added to the App Factory enum, pack registry, guide, and validation.

The infrastructure composition list is read from `template.yaml` by
`packages/template-validation`; `pruneFeaturePacks` is the corresponding
source list for frontend packs. Keep the template lists, generated registry,
and contract aligned. Current Feature Pack dependencies are explicit and
validated: Profile and RBAC require Authentication, and Audit Log requires
Authentication and RBAC. No current pack declares a conflict. If a new pack
needs another dependency or conflict rule, extend the schema and validation
contract deliberately before documenting it; do not add a generic solver.

## Verification expectations

Run the checks relevant to the changed boundary, then the repository contract:

```bash
node .yarn/releases/yarn-4.13.0.cjs lint:all
node .yarn/releases/yarn-4.13.0.cjs tsc
node .yarn/releases/yarn-4.13.0.cjs test:all
node .yarn/releases/yarn-4.13.0.cjs build:all
node .yarn/releases/yarn-4.13.0.cjs build:portal
node .yarn/releases/yarn-4.13.0.cjs test:e2e:smoke
```

Update the current guide when behavior changes. Keep ADRs and verification
reports as historical records, but do not make a phase report the only place a
developer can learn the supported workflow.
