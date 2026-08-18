# Frontend standards

This is the shared frontend contract for generated applications. It describes
what the platform provides and what the application must decide.

## Ownership model

| Layer                | Owner                | Examples                                                                                           |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| Shared foundation    | `@platform/ui`       | semantic color tokens, theme provider, accessible primitives, feedback states, `cn`, UnoCSS preset |
| Application contract | `@platform/sdk`      | app identity, runtime, navigation, auth/permissions/tenant adapter shapes                          |
| Application baseline | Generated repository | shell layout, routes, navigation content, API transport, example pages                             |
| Product domain       | Product team         | domain APIs, rules, pages, workflows, data, copy, and product UX                                   |

Use the [Design System Portal](design-system-portal.md) as the visual and
interaction source of truth before inventing a new shared pattern.

## Shared UI package

`@platform/ui` exports the current accessible primitives: `Avatar`, `Badge`,
`Button`, `Card`, `Checkbox`, `ConfirmDialog`, `Dialog`, `DropdownMenu`,
`Input`, `Label`, `Select`, `Sheet`, `Skeleton`, `Spinner`, `Switch`, `Tabs`,
`Toast`, and `Tooltip`. It also exports `ThemeProvider`, `ThemeToggle`,
`LoadingState`, `ErrorState`, `EmptyState`, `NotFoundState`, and
`QueryBoundary`.

Use semantic classes and tokens rather than product-local hex values or a
second theme layer. `ThemeProvider` already supports light, dark, and system
preference; generated applications should not create a second theme provider
or `src/styles/theme.css`.

## Interaction rules

- Use `Spinner` for indeterminate waits and `Skeleton` when the final content
  shape should not move.
- Use native disabled state for pending controls; keep the action visible and
  explain the pending state.
- Wrap TanStack Query data views with `QueryBoundary` so loading, empty, error,
  and not-found states are consistent.
- Use `useToast()` for transient success/error confirmation and
  `ConfirmDialog` for consequential or destructive actions.
- Use React Hook Form plus Zod for validated forms, surfacing field errors next
  to the field.
- Use `Sheet` for an accessible edge-anchored drawer or responsive navigation;
  share the navigation content between desktop and narrow layouts.
- Keep one `h1` per route, use semantic headings, preserve visible focus, and
  provide labels/descriptions for controls and dialogs.

## Responsive and accessible behavior

Design mobile-first with the standard UnoCSS/Wind breakpoints. Test keyboard
focus, Escape behavior, screen-reader names, focus traps, error recovery,
reduced motion, contrast, and both theme modes. The shared Radix primitives
provide interaction mechanics; the application provides product labels,
content, and recovery choices.

## Application boundary

Generated applications must not recreate:

- `@platform/ui` primitives or Radix wrappers;
- theme tokens, `ThemeProvider`, or shared feedback components;
- the SDK's identity/runtime/navigation/auth/permissions/tenant contracts;
- generic loading/error/empty/table/form interaction behavior already covered
  by the shared package.

The generated application owns concrete route registration, navigation
content, domain pages, data, and product information architecture. The
platform supplies neutral shell and page-pattern building blocks through
`@platform/ui`, but does not dictate which sections or nav items a product
must expose. Extend the generated composition and propose a platform
promotion when behavior is genuinely product-agnostic.

## Shared primitives (`@platform/ui`)

Radix-based, accessible by default: `Avatar`, `Badge`, `Button`, `Card`,
`Checkbox`, `ConfirmDialog`, `Dialog`, `DropdownMenu`, `Input`, `Label`,
`Select`, `Sheet`, `Skeleton`, `Spinner`, `Switch`, `Tabs`, `Toast`
(`ToastProvider`/`useToast`), `Tooltip`. Plus feedback states
(`LoadingState`, `ErrorState`, `EmptyState`, `NotFoundState`,
`QueryBoundary`) and theme (`ThemeProvider`, `ThemeToggle`). All are
rendered live, in both themes, in the platform Design System Portal - treat
that portal as the visual source of truth after any `@platform/ui` change.
The generated application's `/components`, `/table`, and `/form` routes are
developer verification pages only; they are not a second catalog, design-
system implementation, or application-facing default. They are deliberately
absent from the generated shell navigation and home page. A product should
remove or replace them when it establishes its own information architecture.

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

**Navigation and layout use neutral platform patterns, not a fixed information
architecture.** A single-page settings app and a ten-section SaaS product have
different navigation needs, so `ApplicationShell` accepts application-owned
brand, nav items, routes, and content rather than imposing one product layout.
The platform provides `ApplicationShell` plus the edge-anchored responsive
nav primitive (`Sheet`) and this convention:

- Persistent nav for wide viewports, `Sheet` (`side="left"`) for narrow
  ones, sharing one nav-content component between the two so desktop and
  mobile never drift.
- Nav items, active-state styling, and route structure are product code -
  write them against `ApplicationShell`, `Sheet`, and semantic color
  tokens rather than reinventing an off-canvas overlay.

## Data-heavy UI

Use the generated table example as a starting point for a controlled search,
filters, sorting, pagination, and virtualization. Keep columns, row meaning,
domain labels, and export rules product-specific. Put all requests through the
generated API client and let `QueryBoundary` own the shared state shape.

## Platform package changes

The template vendors built tarballs of `@platform/ui` and `@platform/sdk`.
Changing package source does not update an existing generated app. A platform
package change must be built, packed, copied into the skeleton, reflected in
the skeleton lockfile, and recorded in `vendor-manifest.json` before generated
application verification. See [Platform contribution guide](platform-contribution.md).
