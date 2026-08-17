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

The generated application does own the concrete shell, routes, navigation
items, domain pages, and data. The current platform intentionally does not
export one universal application shell because products have different
information architectures. Extend the generated shell instead of creating a
second one, and propose a platform promotion when the behavior is truly
product-agnostic.

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
