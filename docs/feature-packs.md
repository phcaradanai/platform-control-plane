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
  readonly id: string;
  readonly route: `/${string}`;
  readonly navigation: {
    readonly label: string;
    readonly description: string;
    readonly icon?: ComponentType<...>;
  };
  readonly screen: ComponentType;
  readonly dependencies?: readonly string[];
  readonly documentation?: ReactNode;
}
```

The contract is intentionally small. The application owns the route tree and
shell composition; the pack owns the route identity, navigation metadata,
screen, standard-pattern composition, and its own interactions/tests. Packs do
not own a backend, authentication policy, permission policy, tenant model, or
business-domain data model.

## Implemented packs

| Pack        | Generated behavior                                                                                                           | Boundary                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `dashboard` | `/dashboard`, shell navigation, neutral summary metrics, range selector, responsive data table, pending refresh state        | local illustrative rows are replaced by a product query/API contract |
| `settings`  | `/settings`, shell navigation, responsive settings layout, accessible form sections, switches, pending save and saved status | local component state is replaced by a product preference API        |

Both packs compose `@platform/ui`'s `ApplicationPage`, `PageHeader`,
`PageSection`, `DataTable`, `FormPage`, `FormSection`, `FormField`, and
`SettingsLayout`. They do not recreate shared primitives or application shell
foundation.

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

## Verified configurations

- App A: `[]` — base application only; no feature-pack routes or imports.
- App B: `['dashboard']` — dashboard route, navigation, screen, and tests.
- App B2: `['settings']` — settings route, navigation, screen, and tests.
- App C: `['dashboard', 'settings']` — both packs compose through one shell and
  shared patterns without conflicts.

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
4. Add the id to `template.yaml`'s curated enum and `pruneFeaturePacks.each`.
5. Add the guarded registry and route-tree entries.
6. Add a Portal story that imports the real skeleton implementation.
7. Extend `featurePackComposition.test.ts` with no-pack, single-pack, and
   combined selections.

Do not promote product-specific information architecture, terminology,
business validation, permissions, or API assumptions into the pack contract.
