# Frontend feature packs

Phase 5.5B2 evolves the existing capability-composition mechanism into a
small, frontend-first Feature Pack model. A feature pack is selected through
the App Factory's existing `capabilities` field and becomes real generated
application code: a route, a navigation contribution, a screen, interactions,
focused tests, and a clearly replaceable data boundary.

## Contract

Every generated pack follows `templates/platform-mfe-app/skeleton/src/feature-packs/contract.ts`:

```ts
interface FeaturePack {
  readonly id: 'authentication' | 'profile' | 'rbac' | 'dashboard' | 'settings' | 'reports' | 'history' | 'audit-log';
  readonly route: `/${string}`;
  readonly navigation: {
    readonly label: string;
    readonly description: string;
    readonly icon?: ComponentType<...>;
  };
  readonly screen: ComponentType;
  readonly dependencies?: {
    readonly platform?: readonly ('@platform/ui' | '@platform/sdk')[];
    readonly featurePacks?: readonly FeaturePack['id'][];
  };
  readonly documentation?: ReactNode;
}
```

The contract is intentionally small. The application owns the route tree and
shell composition; the pack owns the route identity, navigation metadata,
screen, standard-pattern composition, and its own interactions/tests. Packs do
not own a backend, authentication policy, permission policy, tenant model, or
business-domain data model.

`dependencies.platform` is an allowlisted declaration of packages already
available in the base skeleton. `dependencies.featurePacks` is an explicit
dependency on another selected pack. The registry validates it at startup and
the App Factory schema rejects Profile or RBAC selections without
Authentication, and Audit Log selections without both Authentication and RBAC.
There is no implicit import of an unselected pack.

`dependencies.platform` is a declarative, platform-only dependency contract.
Each entry must be one of the explicitly allowlisted platform packages already
available in the base skeleton: `@platform/ui` or `@platform/sdk`. A pack
cannot request arbitrary npm packages, mutate the generated lockfile, or
trigger an install during scaffolding. The App Factory owns the package
manifest. `dependencies.featurePacks` is the explicit, validated selection
contract for a pack-to-pack dependency; it never silently imports an
unselected screen.

## Implemented packs

| Pack             | Generated behavior                                                                                                                               | Boundary                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard`      | `/dashboard`, shell navigation, neutral summary metrics, range selector, responsive data table, pending refresh state                            | local illustrative rows are replaced by a product query/API contract                                                               |
| `settings`       | `/settings`, shell navigation, responsive settings layout, accessible form sections, switches, pending save and saved status                     | local component state is replaced by a product preference API                                                                      |
| `authentication` | `/authentication`, signed-out/signing-in/authenticated/error/unavailable states, logout, return-path handling, UX-only auth gate                 | `@platform/sdk` `AuthAdapter`; generated apps can use configured OIDC/PKCE or a host adapter, while API security remains authoritative |
| `profile`        | `/profile`, current-user summary, generic identity details, account action boundary, loading/error/signed-out states                             | requires `authentication`; identity fields come from `PlatformUser`, domain profile fields stay product-owned                      |
| `rbac`           | `/rbac`, permission-aware route/action checks, permitted/partial/denied/unavailable states, neutral management boundary                          | requires `authentication`; uses `PermissionsAdapter` checks, not role-name comparisons                                             |
| `reports`        | `/reports`, catalog/search, parameter form, run/loading/empty/error states, bounded result table, permission-aware export boundary               | `ReportsDataSource`; export requires a product-owned endpoint and `reports.export` when permissions are available                  |
| `history`        | `/history`, chronological activity table, search/filter, actor/source/status, details dialog, loading/empty/error states, cursor pagination      | `HistoryDataSource`; the backend supplies events and remains the source of truth                                                   |
| `audit-log`      | `/audit-log`, higher-trust audit inspection table, actor/action/resource/outcome fields, filters, detail view, loading/empty/error/denied states | requires `authentication` and `rbac`; `AuditLogDataSource` is an inspection boundary and makes no compliance or immutability claim |

All packs compose `@platform/ui`'s application patterns and primitives. They
do not recreate shared primitives or application shell foundation. Identity
packs use `@platform/sdk` for session and permission contracts and keep
provider-specific behavior outside the pack. Operational-data packs use
TanStack Query and the shared data-page/detail patterns; they do not call
`fetch()` from UI components.

## Composition and pruning

The existing `fetch:template` plus Nunjucks block guards remain the only
composition mechanism. `feature-packs/registry.tsx` is the single generated
registry. The template adds optional route files and route-tree entries only
when selected. `pruneFeaturePacks` then removes each unselected pack's source
directory and route file. This leaves no unselected navigation contribution,
route import, route type, or screen in the generated repository.

The package dependency graph stays frozen and shared. Packs use dependencies
already present in the base skeleton (`@platform/ui`, React, and lucide-react),
so selecting a pack does not require a per-selection lockfile or a post-
generation install step.

### Data/API boundaries

Operational data packs export small typed data-source contracts that accept an
`AbortSignal` and return plain records/pages:

- `ReportsDataSource` lists definitions, runs a parameterized report, and may
  expose an optional export request.
- `HistoryDataSource` accepts search/filter/cursor parameters and returns a
  chronological page.
- `AuditLogDataSource` accepts search/outcome/cursor parameters and returns
  audit inspection records.

The generated app provides clearly illustrative local sources so the UX is
usable immediately. A product replaces those sources with calls through its
existing `src/api/client.ts` boundary; the screen, state handling, and shared
patterns stay unchanged. No pack persists events, establishes security, or
pretends that a local sample is authoritative.

### Text and optional i18n

Pack navigation metadata and sample screen copy are fallback application text,
not a dependency on a particular translation library. Packs do not import the
optional `i18n` capability. When `i18n` is selected, the generated shell
localizes its platform-owned navigation labels through stable `navigation.*`
keys and falls back to the pack's metadata when a key is not supplied. Product
owners remain responsible for translating or replacing pack screen copy at the
domain boundary; `@platform/ui` stays copy-agnostic and accepts caller-provided
labels.

### Developer verification routes

The generic `/components`, `/table`, and `/form` routes are intentionally
developer verification examples for the generated foundation and its smoke
tests. They are not application-facing defaults: the shell navigation and home
page do not link to them. A product should remove or replace these routes when
its domain information architecture is introduced. They are kept in the
skeleton so a fresh app can verify shared primitives, data-page behavior, and
form behavior without promoting those demos into a product feature pack.

## Verified configurations

- App A: `[]` — base application only; no feature-pack routes or imports.
- App B: `['authentication']` — authentication route, navigation, screen, and tests.
- App C: `['authentication', 'profile']` — Profile resolves its explicit
  Authentication dependency.
- App D: `['authentication', 'rbac']` — RBAC resolves its explicit
  Authentication dependency.
- App E: `['reports']` — Reports works independently with its own data source.
- App F: `['history']` — History works independently with cursor pagination.
- App G: `['authentication', 'rbac', 'audit-log']` — Audit Log resolves both
  identity and permission dependencies.
- App H: `['authentication', 'profile', 'rbac', 'dashboard', 'settings',
'reports', 'history', 'audit-log']` — all current packs compose through one
  shell and shared patterns.

`['profile']` and `['rbac']` without `['authentication']`, plus `['audit-log']`
without both `['authentication', 'rbac']`, are invalid App Factory selections
and are rejected before repository publication.

The Design System Portal imports the same skeleton pack implementations used
by generated apps. Its `Feature packs` stories cover each pack independently
and the combined shell composition. The portal's shared `ThemeProvider`, real
`ThemeToggle`, and Storybook/browser viewport controls make light/dark and
narrow responsive behavior reviewable without a duplicate demo implementation.

## Adding a pack

1. Add `src/feature-packs/<id>/index.tsx` and focused tests.
2. Use existing `@platform/ui` patterns and keep sample data explicitly
   illustrative and replaceable.
3. Add a route module under `src/routes/<id>.tsx`.
4. Add the id to `template.yaml`'s curated enum and `pruneFeaturePacks.each`;
   if it depends on another pack, add both the schema validation and the
   `dependencies.featurePacks` declaration.
5. Add the guarded registry and route-tree entries.
6. Add a Portal story that imports the real skeleton implementation.
7. Extend `featurePackComposition.test.ts` with no-pack, single-pack, and
   combined selections.

Do not promote product-specific information architecture, terminology,
business validation, permissions, or API assumptions into the pack contract.
