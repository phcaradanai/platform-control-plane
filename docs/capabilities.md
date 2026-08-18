# Feature Pack guide

The App Factory calls its controlled selection list `capabilities`. This
guide uses **Feature Pack** for a reusable application capability while
keeping implementation status explicit: a selectable identifier is not
automatically composed. Phase 4 established the deterministic infrastructure
composition path, and Phase 5.5B2 extends it with frontend Feature Packs; see
[feature-packs.md](./feature-packs.md) for the route and screen contract.
This document remains the infrastructure capability contract: what
"composed" means, which platform integrations are composed today, how the
mechanism works, and how to add another one.

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

The closed enum in `templates/platform-mfe-app/template.yaml` currently has 15
values. Every selection is recorded in `platform-app.json`; composed
platform capabilities and frontend Feature Packs also add the generated code
described in the final column.

| Identifier       | Status today                  | What a developer gets |
| ---------------- | ----------------------------- | --------------------- |
| `notifications`  | **Composed**                  | `src/capabilities/notifications/`, header notification UI, and toast integration |
| `i18n`           | **Composed**                  | `I18nProvider`, `useI18n()`, two locales, and the header language switcher |
| `observability`  | **Composed**                  | Error/rejection capture and `trackEvent()` initialization |
| `authentication` | **Composed Feature Pack**     | `/authentication` route, session UX, sign-in states, and tests |
| `profile`        | **Composed Feature Pack**     | `/profile` route and current-user UX; requires Authentication |
| `rbac`           | **Composed Feature Pack**     | `/rbac` route and permission-aware UX; requires Authentication |
| `dashboard`      | **Composed Feature Pack**     | `/dashboard` route, summary, table, refresh interaction, and tests |
| `settings`       | **Composed Feature Pack**     | `/settings` route, responsive settings form, save interaction, and tests |
| `reports`        | **Composed Feature Pack**     | `/reports` route with typed, replaceable report-data boundary |
| `history`        | **Composed Feature Pack**     | `/history` route with typed, replaceable activity-data boundary |
| `audit-log`      | **Composed Feature Pack**     | `/audit-log` route with typed audit inspection boundary; requires Authentication and RBAC |
| `tenant`         | **Recorded only**             | An entry in `platform-app.json`; no tenant provider |
| `theme`          | **Always-on foundation**      | `@platform/ui` theme provider and light/dark/system behavior already included |
| `desktop-ready`  | **Recorded only**             | An entry in `platform-app.json`; no desktop shell or runtime |
| `mobile-ready`   | **Recorded only**             | An entry in `platform-app.json`; no mobile shell or runtime |

Feature Pack contracts, data boundaries, and dependency validation are
documented in [feature-packs.md](./feature-packs.md). `theme` is not
composed as a toggle because it is already part of every generated app.

## Why the infrastructure capability set remains small

Infrastructure capabilities are limited to integrations that fit stable,
product-neutral extension points. Feature Packs own generated screens and
routes; tenant services, desktop/mobile runtimes, and backend security remain
explicit platform or product contracts rather than placeholders.

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
- Selection never changes the generated `package.json` or lockfile. Feature
  Pack selections intentionally change the templated route tree and generated
  source; infrastructure capability selections only add or remove their
  documented extension-point modules.

Feature Pack dependencies are explicit: Profile and RBAC require
Authentication, and Audit Log requires both Authentication and RBAC. The App
Factory validates those selections before publication; no pack implicitly
imports an unselected pack. If a future pack needs another dependency,
implement and validate it in the template contract first rather than encoding
it only in documentation or assuming semantic names imply runtime behavior.

The infrastructure extension points are intentionally small and documented:

- `src/app.tsx` mounts `I18nProvider` when `i18n` is selected.
- `src/main.tsx` calls `initObservability()` when `observability` is
  selected.
- `src/components/layout/app-shell.tsx` renders `LanguageSwitcher` and
  `NotificationsCenter` when their capabilities are selected.

## How composition works today

The template renders the skeleton, then runs the `pruneCapabilities` built-in
`fs:delete` step for each of `notifications`, `i18n`, and
`observability` that was not selected. Its extension-point files use
generation-time Nunjucks guards, so the generated app has no dangling imports
for omitted modules. The same list is read from `template.yaml` by
`packages/template-validation/src/capabilityComposition.test.ts`.

The `fetch:template` step renders skeleton files through Nunjucks with
${{ ... }} variable delimiters. Plain block tags such as
`{% if 'i18n' in values.capabilities %} ... {% endif %}` remain available
for generation-time guards. The result is that generated
`app.tsx`, `main.tsx`, and `app-shell.tsx` contain only imports and
calls for selected infrastructure capabilities; no dead conditionals survive
in the generated repository.

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
Feature packs may add routes through the same templated route tree.
`src/routeTree.gen.ts` is committed (TanStack Router's generated route
manifest, needed so `npm run typecheck` works before a build regenerates it -
see [app-template.md](app-template.md)). Feature-pack route imports and route
types are guarded by the same Nunjucks selection blocks and the pack's route
module is pruned when unselected. Infrastructure capabilities continue to
mount into documented extension points.

## Determinism and safety

- **Deterministic**: the same `capabilities` selection always produces the
  same generated files - no randomness, no network calls, no capability
  reads another capability's state.
- **Independently testable**: each capability's module has its own test
  file, testable in isolation before any scaffolding happens.
- **Safe to combine**: composed capabilities don't share mutable state or
  DOM outside their own header slot, and none currently declares a
  conflict. The mechanism has room to grow - a future capability could
  declare `requires`/`conflictsWith` against another id, enforced the same
  way `pruneCapabilities`' `if:` already is - but nothing in the curated set
  needs it yet, so no unused validation code was added for it.
- **Invalid input is inert, not just schema-rejected**: `template.yaml`'s
  `capabilities` field is a closed enum with `uniqueItems: true`, which is
  the first line of defense at the form/task-submission layer. The
  composition layer itself doesn't additionally trust that: an unknown id
  or a duplicate reaching `pruneCapabilities`' `if:` check (`each.value in
parameters.capabilities`) simply evaluates to a normal true/false with no
  special-casing required - an unknown id never matches any `each.value`
  and has no effect, and a duplicate is idempotent. This is exercised
  directly in `capabilityComposition.test.ts` rather than only argued in
  prose.

## Adding another composed capability

1. Confirm it needs no new npm dependency and no new top-level route (see
   above); if it needs either, it isn't a fit for this mechanism yet.
2. Add `src/capabilities/<id>/` to the skeleton with its implementation and
   tests, self-contained.
3. Add an `{% if '<id>' in values.capabilities %} ... {% endif %}` guard at
   the relevant extension point(s) (`app.tsx`, `main.tsx`, `app-shell.tsx`, or
   a new documented extension point if none of those fit).
4. Add `<id>` to `pruneCapabilities`' `each:` list in `template.yaml`.
5. Add the capability to the table above.
6. Run `packages/template-validation`'s suite - `capabilityComposition.test.ts`
   picks up the new id automatically (it reads the list from
   `template.yaml`) and will fail if any surviving file still imports the
   new capability's directory when it's pruned.
