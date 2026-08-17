# Design System Portal guide

The Design System Portal is the platform-owned Storybook review surface for
`@platform/ui`. It aliases the package name to the real source tree, so the
components and tokens you inspect are the ones generated applications consume.

## Open the portal

From the platform-control-plane root:

```bash
node .yarn/releases/yarn-4.13.0.cjs dev:portal
```

Open <http://127.0.0.1:6006>. Build the same portal used for production checks
with:

```bash
node .yarn/releases/yarn-4.13.0.cjs build:portal
```

The source is under `packages/platform-ui/src/catalog`. Storybook's a11y addon,
the shared theme provider, semantic tokens, and UnoCSS preset are configured
in `packages/platform-ui/.storybook`.

## What to review

The current catalog includes:

- **Foundations / Tokens and themes** — semantic colors, typography, spacing,
  light/dark/system behavior, and persistence;
- **Foundations / Primitives** — controls, surfaces, identity, menus, tabs,
  dialogs, sheets, confirmation, focus, disabled, and pending states;
- **Foundations / Feedback states** — loading, empty, error, not-found, and
  toast behavior;
- **Reusable UX patterns** — search/filter, data presentation, and responsive
  navigation compositions that applications can adapt;
- **Application features / Reserved future packs** — a visible boundary for
  Authentication, Dashboard, Settings, Permissions, Reports, and History UX
  that is not currently selectable Feature Pack code.

Review each candidate in both themes and at narrow and wide viewport sizes.
Use keyboard navigation and Escape-to-close where relevant. Check focus rings,
labels, descriptions, disabled/pending actions, error recovery, empty states,
responsive overflow, reduced motion, and the accessible name of icon-only
controls. The portal is the place to catch a platform-level interaction gap
before every product reimplements it.

## Portal versus product code

Keep a feature product-specific when its content, domain data, route structure,
workflow rules, or information architecture differs by product. Use the
platform package for generic interaction behavior and semantic styling.

Promote something back into the platform when it is genuinely reusable across
unrelated applications and carries a stable, accessible interaction contract
that developers should not have to re-derive. A repeated component is not by
itself a reason to promote it.

Do not copy Storybook implementations into generated applications. Import
`@platform/ui`, use its exports, and add product-specific composition in the
generated repository. See [Frontend standards](frontend-standards.md) and the
[Platform Contribution Guide](platform-contribution.md).

## Current boundary

The portal documents and exercises the shared UI foundation. It does not prove
that a future Authentication, Profile, Permission/RBAC, Dashboard, Settings,
Reports, History, or Audit Log backend exists. Those feature/data contracts
must be implemented and connected separately; the
[Feature Pack guide](capabilities.md) is the source of truth for current
selection behavior.
