# Design System Portal

The platform-owned Storybook catalog is the review surface for the frontend
standard. It lives beside the real `@platform/ui` source in
`packages/platform-ui/.storybook` and `packages/platform-ui/src/catalog`.

## Run it

```bash
yarn dev:portal       # http://127.0.0.1:6006
yarn build:portal     # production Storybook build
```

The portal aliases `@platform/ui` to `packages/platform-ui/src/index.ts`
and loads the shared theme and UnoCSS preset. Stories compose the exported
primitives; they do not copy component or token implementations. Changes to
the package therefore appear in the portal from the same source developers
consume.

## Catalog boundary

- **Foundations / Primitives** — tokens, themes, controls, surfaces,
  overlays, identity, feedback, loading, and confirmation states.
- **Reusable UX Patterns** — only patterns already supported by the platform,
  such as responsive navigation, search/filter, and data presentation.
- **Feature Packs** — the real generated `dashboard` and `settings`
  implementations, including their routes' screen composition, navigation
  metadata, interactions, and replaceable sample-data boundaries. Future
  Authentication, Permissions, Reports, and History packs remain reserved.

Review light/dark themes, narrow layouts, focus and keyboard behavior,
pending/destructive actions, and non-ideal states before promoting a shared
capability. A standardized application feature must not become selectable in
the App Factory until its important UX/UI states are inspectable in this
portal.
