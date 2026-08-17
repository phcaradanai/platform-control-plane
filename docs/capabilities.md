# Feature Pack guide

The App Factory calls its controlled selection list `capabilities`. This guide
uses **Feature Pack** for a reusable application capability, but keeps the
implementation status explicit: a selectable identifier is not automatically a
composed feature.

## Status meanings

- **Composed** — selecting it adds code and wiring to the generated repository;
  leaving it unselected removes that module.
- **Recorded only** — selecting it writes the identifier to
  `platform-app.json`; it does not add pages, providers, APIs, or packages.
- **Always-on foundation** — the behavior is part of every generated app and
  is not a useful toggle.
- **Not an App Factory identifier** — no generated Feature Pack exists under
  that name in the current template.

## Current selection matrix

The closed enum in `templates/platform-mfe-app/template.yaml` currently has 13
values:

| Identifier       | Status today             | What a developer gets                                                             |
| ---------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `notifications`  | **Composed**             | `src/capabilities/notifications/`, header notification UI, and toast integration  |
| `i18n`           | **Composed**             | `I18nProvider`, `useI18n()`, two locales, and the header language switcher        |
| `observability`  | **Composed**             | `window.onerror`/`unhandledrejection` capture and `trackEvent()` initialization   |
| `authentication` | **Recorded only**        | An entry in `platform-app.json`; no login page or identity provider               |
| `rbac`           | **Recorded only**        | An entry in `platform-app.json`; no authorization provider or enforcement         |
| `dashboard`      | **Recorded only**        | An entry in `platform-app.json`; no generic dashboard page or data source         |
| `reports`        | **Recorded only**        | An entry in `platform-app.json`; no report framework or data-source contract      |
| `history`        | **Recorded only**        | An entry in `platform-app.json`; no history/event data source                     |
| `audit-log`      | **Recorded only**        | An entry in `platform-app.json`; no audit service or integrity guarantee          |
| `tenant`         | **Recorded only**        | An entry in `platform-app.json`; no tenant provider                               |
| `theme`          | **Always-on foundation** | `@platform/ui` theme provider and light/dark/system behavior are already included |
| `desktop-ready`  | **Recorded only**        | An entry in `platform-app.json`; no desktop shell/runtime                         |
| `mobile-ready`   | **Recorded only**        | An entry in `platform-app.json`; no mobile shell/runtime                          |

`profile` and `settings` are not current App Factory identifiers. The Backstage
control plane has its own user-settings plugin, but that is not a generated-app
Settings or Profile Feature Pack. `PlatformUser` can carry optional display
name/email data when a real auth adapter is present; that is not a profile
feature.

## Dependency behavior

The actual composition contract has no declared `requires` or `conflictsWith`
rules today.

- Every generated app has the base skeleton, `@platform/ui`, and
  `@platform/sdk`; those are foundation dependencies, not selectable packs.
- `notifications`, `i18n`, and `observability` are independent. Selecting one
  does not select either of the others, and none currently adds an npm
  dependency.
- Recorded-only selections do not automatically include a provider or another
  pack. Selecting `rbac` does not wire `authentication`; selecting `reports`
  does not wire `history` or `audit-log`.
- No selection changes the generated `package.json`, lockfile, or committed
  route tree.

If a future Feature Pack needs a dependency, implement and validate that
dependency in the template contract first. Do not encode a dependency only in
documentation or assume semantic names imply runtime behavior.

## How composition works today

The template renders the skeleton, then runs the `pruneCapabilities` built-in
`fs:delete` step for each of `notifications`, `i18n`, and `observability` that
was not selected. The skeleton's extension-point files use generation-time
guards, so the generated app has no dangling imports for omitted modules. The
same list is read from `template.yaml` by
`packages/template-validation/src/capabilityComposition.test.ts`.

This is deterministic: the same selection produces the same files, and the
capability modules are independently tested. It is intentionally narrower than
a runtime plugin system; it does not load remote modules or install arbitrary
packages during scaffolding.

## Choosing a capability

Before selecting an identifier, answer:

1. Does the matrix say **Composed** or **Always-on**?
2. If it is **Recorded only**, do you still need the metadata for a future
   platform integration, or should the behavior remain product-specific?
3. Is there a real provider/backend for the behavior? If not, do not present a
   placeholder as production functionality.
4. Does the desired UX already exist in the
   [Design System Portal](design-system-portal.md)?

For a domain-specific dashboard, report, history, audit log, settings, or
profile, build the feature in the generated repository and use the shared UI
and API conventions. Promote it to the platform only through the
[Platform Contribution Guide](platform-contribution.md).
