# Frontend standard platform

Phase 5.5A makes the frontend foundation - not any single application's
product UX - the thing every generated Platform MFE application starts
from. This document is the contract a developer or another AI agent should
read instead of reverse-engineering conventions from an existing
application's source. It defines what the platform guarantees, what a
generated application is expected to build for itself, and where the line
between the two sits.

If you are building a new application on this platform and haven't seen
another application's code, this document, `@platform/ui`'s exports, and
the platform [Design System Portal](./design-system-portal.md) are the
intended starting point. Run `yarn dev:portal` and open
`http://127.0.0.1:6006` to inspect the live standard.

## Ownership model

Three tiers, in order of how broadly a concern should live:

| Tier                             | Lives in                                                      | Examples                                                                                                   |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Platform standard**            | `@platform/ui` (tokens, primitives, UnoCSS preset)            | colors, spacing/radius/shadow scale, `Button`, `Dialog`, `Sheet`, feedback states, focus/keyboard behavior |
| **Reusable application pattern** | Documented here; implemented per app from platform primitives | responsive sidebar nav + mobile drawer, filter/search/sort table conventions, dashboard stat display       |
| **Product-specific**             | The generated application's own `src/`                        | nav item content, domain data tables, product-specific dialogs and forms, dashboards' actual metrics       |

A concern is promoted to `@platform/ui` only when it is genuinely
product-agnostic (works unchanged across unrelated applications) _and_
either (a) requires non-obvious accessible/interaction behavior a developer
shouldn't have to re-derive (focus trap, portal, animation direction), or
(b) is explicitly called for by this document. Everything else stays a
documented pattern or stays in the product.

## Design foundation

### Color

Every semantic color is a CSS custom property in `@platform/ui/theme.css`,
stored as **space-separated RGB channels** ("R G B", no `rgb()` wrapper,
no hex): `--color-primary: 29 78 216;`. `uno-preset.ts` wraps each one as
`rgb(var(--color-x) / <alpha-value>)` in `platformUnoTheme`. This is what
makes opacity modifiers work correctly: `bg-primary/10`, `border-border/60`,
`hover:bg-muted/50`, etc. all resolve to a real translucent color instead
of silently collapsing to full opacity. **Do not add a hex or bare
`var(--color-x)` token** - either breaks opacity slicing for every
utility built from it. Any new semantic color needs both a `:root` and a
`[data-theme='dark']` entry (light/dark parity is enforced by pairing, not
by tooling - review both when adding one).

Available semantic tokens: `background`, `foreground`, `card` (+
`card-foreground`), `primary` (+ `-foreground`), `secondary` (+
`-foreground`), `muted` (+ `-foreground`), `accent` (+ `-foreground`),
`destructive` (+ `-foreground`), `success` (+ `-foreground`), `warning`
(+ `-foreground`), `border`, `ring`. Product code should reach for one of
these before introducing a new color; a new semantic token is a
design-system decision (add it to `theme.css` + `uno-preset.ts`), not a
per-component `#hex` or raw Tailwind color utility.

### Spacing, sizing, radius, elevation, motion, breakpoints

These come from `presetWind3` (UnoCSS's Tailwind-compatible preset)
unmodified - its default scale (`p-4`, `rounded-md`, `shadow-sm`,
`duration-150`, `sm:`/`md:`/`lg:`/`xl:`/`2xl:` breakpoints) _is_ the
platform standard. There is deliberately no parallel token layer
duplicating it: introducing one would be a second styling system for no
behavioral gain. Conventions to follow rather than new tokens to add:

- **Radius**: `rounded-md` for controls (buttons, inputs, badges),
  `rounded-lg` for surfaces (cards, dialogs, sheets) - see the `card`
  UnoCSS shortcut and `Dialog`/`Sheet` source for the reference values.
- **Elevation**: `shadow-sm` for resting surfaces, reserve `shadow-lg` for
  content that floats above the page (modals, popovers, dropdowns).
- **Motion**: `transition-colors` (already in the `btn` shortcut) for
  hover/focus state changes. `prefers-reduced-motion: reduce` is handled
  globally in `theme.css` - components don't need their own media query.

### Light/dark

`ThemeProvider`/`useTheme` (light/dark/system) ships unconditionally in
every generated app - it is not a capability toggle. Because every color
token is a CSS variable swapped by `[data-theme]`, product code never
writes a `dark:` variant; it writes semantic utilities (`bg-card
text-muted-foreground`) and both themes fall out for free.

## Shared primitives (`@platform/ui`)

Radix-based, accessible by default: `Avatar`, `Badge`, `Button`, `Card`,
`Checkbox`, `ConfirmDialog`, `Dialog`, `DropdownMenu`, `Input`, `Label`,
`Select`, `Sheet`, `Skeleton`, `Spinner`, `Switch`, `Tabs`, `Toast`
(`ToastProvider`/`useToast`), `Tooltip`. Plus feedback states
(`LoadingState`, `ErrorState`, `EmptyState`, `NotFoundState`,
`QueryBoundary`) and theme (`ThemeProvider`, `ThemeToggle`). All are
rendered live, in both themes, in the platform Design System Portal - treat
that portal as the visual source of truth after any `@platform/ui` change.
The generated application's `/components` route is only an integration
smoke page; it is not a second catalog or design-system implementation.

`Sheet` and `ConfirmDialog` were promoted in this phase after the
Workspace Hub exercise showed a developer hand-rolling both from raw
Radix primitives just to get an off-canvas nav drawer and a
confirm-before-delete flow - functionality with no product-specific
content, needed by nearly every multi-page application. `Dialog` is
deliberately centered-only; `Sheet` is the edge-anchored counterpart
(`side="left" | "right" | "top" | "bottom"`) for drawers, filter panels,
and detail panels.

## Interaction standards

- **Loading**: `Spinner` for indeterminate waits, `Skeleton` for
  content-shaped placeholders where layout should not shift once data
  arrives.
- **Pending/disabled**: form controls and buttons use the native
  `disabled` attribute plus `disabled:opacity-50
disabled:pointer-events-none` (already in the `btn`/`input` shortcuts) -
  don't hide a pending control, disable it so its position and focus
  target stay stable.
- **Empty / error / not-found**: `EmptyState` / `ErrorState` /
  `NotFoundState`, composed by `QueryBoundary` around a TanStack Query
  result so a data view gets all three states (plus loading) without each
  screen re-implementing the switch.
- **Success**: `useToast()` for transient confirmation of a completed
  action (save, create, delete) rather than inline text that requires the
  user to notice it before it disappears from view.
- **Confirmation / destructive actions**: `ConfirmDialog` for any
  irreversible or consequential action. Set `destructive` to use the
  destructive button variant; it manages its own pending/open state so
  callers don't re-implement the in-flight sequence. Pass localized
  confirmLabel, cancelLabel, pendingLabel, and closeLabel values. When
  onConfirm rejects, the dialog stays open, pending state resets, and
  onConfirmError owns the product-level error surface and recovery choice.
- **Form validation**: Zod schema + React Hook Form (see the skeleton's
  `features/form-demo/`) - validate on submit and surface errors next to
  the field, not only in a toast.
- **Asynchronous actions**: route them through TanStack Query
  (`useQuery`/`useMutation`); let `QueryBoundary` and `useToast` own the
  loading/error/success surface rather than local `useState` state
  machines per screen.

Shared feedback primitives take product-facing labels from the application
instead of inventing English defaults. Pass localized labels to
`LoadingState`, `ErrorState`, `NotFoundState`, `QueryBoundary`, and
`ToastProvider`. The application owns the translated message and the
recovery action; the primitive owns semantics, layout, and interaction.

## Application conventions

Page hierarchy: one `<h1>` per route, section headings as `<h2>`, body
copy in `text-muted-foreground` under a heading - see any skeleton route
for the pattern. Content width is capped and centered by `AppShell`
(`max-w-5xl` by default); pages don't need their own width constraint.

**Navigation and layout are intentionally not prescribed as a single
shared shell component.** A single-page settings app and a ten-section
SaaS product have different navigation needs, and forcing one concrete
sidebar/nav-item structure into the platform would fail the neutrality
requirement (every generated app would visibly be "one app's layout").
Instead, the platform provides the primitive an edge-anchored responsive
nav needs (`Sheet`) and this convention:

- Persistent nav for wide viewports, `Sheet` (`side="left"`) for narrow
  ones, sharing one nav-content component between the two so desktop and
  mobile never drift.
- Nav items, active-state styling, and route structure are product code -
  write them against `Sheet` and the semantic color tokens rather than
  reinventing an off-canvas overlay.

## Data-heavy UI

Filters/search/sort/pagination follow the same shape as the skeleton's
`features/table-demo/`: a controlled search `Input`, filter `Select`(s),
and a sortable, virtualized table for large row counts. Every data view
should compose `QueryBoundary` for its loading/empty/error states rather
than hand-rolling a fetch-state switch - this is the single most
duplicated piece of infrastructure across product code today.
Presentation (which columns, what a row means, what "empty" should say)
stays product-specific; the request/loading/error/pagination _shape_
should not vary app to app.

## Accessibility

Platform defaults, not per-project polish:

- **Keyboard**: every interactive primitive is Radix-based and ships
  correct roving focus, Escape-to-close, and focus trap (`Dialog`,
  `Sheet`, `Select`, `DropdownMenu`, `Tabs`) without product code doing
  anything extra.
- **Focus visibility**: `:focus-visible` gets a 2px ring
  (`rgb(var(--color-ring))`) globally from `theme.css`; don't suppress
  outlines on custom interactive elements.
- **Screen-reader semantics**: use the semantic parts each primitive
  exposes (`DialogTitle`/`DialogDescription`, `SheetTitle`/
  `SheetDescription`, `Label` tied to its control via `htmlFor`) instead
  of visual-only headings. `Avatar` always exposes an accessible name
  (image `alt` or fallback `aria-label`, both set to the `name` prop) -
  never mark an avatar `aria-hidden` in a context where it's the only
  visual indicator of _who_.
- **Localized dismiss actions**: DialogContent and SheetContent require an
  accessible close label from the application. Shared primitives do not
  invent product copy; pass labels from the app's i18n boundary.
- **Reduced motion**: handled globally (`prefers-reduced-motion: reduce`
  in `theme.css`); component-level animation classes don't need their own
  guard.
- **Contrast**: every paired foreground/background token in `theme.css`
  is documented as meeting WCAG AA in both themes - a new token pair
  should meet the same bar before merging.
- **Responsive**: presetWind3's standard breakpoints
  (`sm`/`md`/`lg`/`xl`/`2xl`); design mobile-first (unprefixed utilities
  are the small-viewport styles) rather than adding a `mobile:` variant.

## Vendoring: how a platform fix reaches a generated app

`@platform/ui` is not resolved from the monorepo workspace at generation
time - the `platform-mfe-app` template copies a **prebuilt tarball**
(`templates/platform-mfe-app/skeleton/vendor/platform-ui-0.1.0.tgz`) into
every generated app's `vendor/` directory
(`copyWithoutTemplating`, see `template.yaml`). Editing
`packages/platform-ui/src` alone changes nothing for a freshly generated
app until the tarball is rebuilt and re-vendored:

1. `yarn workspace @platform/ui build`
2. `npm pack` inside `packages/platform-ui`, copy the resulting `.tgz`
   over `templates/platform-mfe-app/skeleton/vendor/platform-ui-0.1.0.tgz`
3. Delete and regenerate
   `templates/platform-mfe-app/skeleton/package-lock.json`
   (`npm install --package-lock-only` - a plain `npm install` does not
   re-hash an existing `file:` dependency; see the Phase 2.1 EINTEGRITY
   incident)
4. Recompute the source fingerprint and update
   `templates/platform-mfe-app/vendor-manifest.json` (`sourceFingerprint`
   for the `@platform/ui` entry)

`packages/template-validation/src/vendorTarball.test.ts` fails the build
if the recorded fingerprint drifts from the package's actual source,
which is what makes step 4 a hard requirement rather than a suggestion.
This four-step manual process is itself a platform gap (see the phase
closure report) - there is no CI job yet that runs it automatically on a
`packages/platform-ui` change.

## What this phase deliberately did not do

- **No new component library beyond what a real gap justified.** `Sheet`
  and `ConfirmDialog` were promoted because Workspace Hub's implementation
  is direct evidence a developer had to build them from scratch;
  everything else stayed either a documented pattern (responsive nav,
  data-heavy UI conventions) or product-specific.
- **No forced single application shell.** See "Application conventions"
  above - the platform gives primitives and a pattern, not a mandatory
  `AppShell` with a fixed sidebar.
- **No second styling system.** Spacing/radius/shadow/motion/breakpoints
  stay on presetWind3's default scale; only color got a dedicated token
  layer, because color is the one axis that must be theme-swappable.

## Generated application boundary

Generated applications consume the vendored @platform/ui package and its
theme.css and uno-preset exports. They should import shared primitives,
feedback states, ThemeProvider, ThemeToggle, cn, and semantic styling from
that package.

The application owns layout, routes, features, capability composition, and
product-specific content. It must not recreate src/components/ui,
src/components/theme/theme-provider, or src/styles/theme.css, and it must
not copy Radix wrappers or token definitions into a local layer. If a
cross-product behavior is missing, raise it as a platform primitive
proposal rather than quietly forking the generated foundation.

The permanent visual review surface is the platform Design System Portal,
not generated application code. A standardized application feature is not
eligible to become an App Factory selection until its important UX/UI states
can be inspected there; see [design-system-portal.md](./design-system-portal.md)
for the catalog boundary and commands.
