# Capability composition

Phase 4 established the App Factory's deterministic capability composition
path. Phase 5.5B2 extends that same path with frontend Feature Packs; see
[feature-packs.md](./feature-packs.md) for the route/screen contract. This
document remains the infrastructure capability contract: what "composed"
means, which platform integrations are composed today, how the mechanism
works, and how to add another one.

See [ADR 0004](./adr/0004-capability-composition.md) for the design
rationale and the alternatives that were ruled out.

## Composed vs recorded-only

`templates/platform-mfe-app/template.yaml`'s `capabilities` field is a
closed, 15-item enum (see [app-template.md](./app-template.md)). Every
selection is recorded in the generated `platform-app.json`, unchanged from
earlier phases. Three infrastructure capabilities are additionally
**composed** - they deterministically add real files, wiring, and (gated)
UI to the generated application:

| Capability                                                                                                      | Status        | Composed effect                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `notifications`                                                                                                 | **Composed**  | `src/capabilities/notifications/` - a header bell menu with demo notifications and a "send test notification" button that fires a toast through `@platform/ui`'s existing `ToastProvider`.                                                                                                             |
| `i18n`                                                                                                          | **Composed**  | `src/capabilities/i18n/` - an `I18nProvider`/`useI18n()` context (2 locales) and a header `LanguageSwitcher`.                                                                                                                                                                                          |
| `observability`                                                                                                 | **Composed**  | `src/capabilities/observability/` - `window.onerror`/`unhandledrejection` capture plus a `trackEvent()`/sink API, initialized in `main.tsx`.                                                                                                                                                           |
| `reports`, `history`, `audit-log`, `tenant`, `theme`, `desktop-ready`, `mobile-ready` | Recorded only | Present in `platform-app.json.capabilities`; no generated code yet. Deferred to later phases - most require infrastructure explicitly out of scope (backend contracts for reports/history/tenant, or Module Federation/Super App runtime for desktop/mobile). |

The `authentication`, `profile`, `rbac`, `dashboard`, and `settings`
selections are frontend Feature Packs rather than infrastructure capabilities.
They compose routes, shell navigation, pattern-based screens, interactions,
and tests through the same mechanism; their contract and pruning rules are
documented in
[feature-packs.md](./feature-packs.md).

`theme` is not composed as a _toggle_ because it isn't optional: every
generated app already ships `@platform/ui`'s `ThemeProvider` unconditionally
(light/dark/system, present before this phase). Composing it would mean
making it removable, which isn't the goal - selecting it is a no-op
today and it stays in the recorded-only list.

## Why the infrastructure capability set remains small

The composition mechanism (below) has one hard constraint: **a composed
capability may add files and wire extension points, but it may not add npm
dependencies.** The skeleton ships a frozen `package-lock.json` so
generated CI can run `npm ci` (see
[app-template.md](./app-template.md#automated-validation)); conditionally
adding a dependency would require the lockfile to vary per capability
selection, which a static, committed lockfile cannot do without running
`npm install` during the scaffolder task (arbitrary code execution during
scaffolding, deliberately not something this control plane does).

`notifications`, `i18n`, and `observability` were chosen because a useful
version of each is implementable with zero new npm packages, reusing
`@platform/ui` primitives already vendored into the skeleton
(`DropdownMenu`, `ToastProvider`, `Select`) or plain React context. They are
also frontend-only and orthogonal to each other and to everything explicitly
out of scope for this phase (Module Federation/Super App runtime, CodeScape,
Keycloak, a tenant backend, desktop/mobile shells).

## How composition works

1. **Extension points, not scattered conditionals.** Exactly three base
   files own the wiring, each with a short comment pointing at the owning
   capability:

   - `src/app.tsx` - mounts `I18nProvider` (`i18n`).
   - `src/main.tsx` - calls `initObservability()` (`observability`).
   - `src/components/layout/app-shell.tsx` - renders `LanguageSwitcher`
     (`i18n`) and `NotificationsCenter` (`notifications`).

   Each capability's implementation lives entirely under its own
   `src/capabilities/<id>/` directory with its own tests. No composed
   capability's internals leak into another's.

2. **Nunjucks conditionals decide what ships, at generation time.** The
   scaffolder's `fetch:template` step already renders every skeleton file
   through nunjucks with `${{ ... }}` expression delimiters (see
   `packages/template-validation/src/renderSkeleton.ts`). The three
   extension-point files add plain nunjucks block tags -
   `{% if 'i18n' in values.capabilities %} ... {% endif %}` - around the
   import and the JSX/call site for each composed capability. Backstage's
   `SecureTemplater` only reconfigures nunjucks's _variable_ delimiters to
   `${{ }}`; block tags (`{% %}`) keep their nunjucks defaults, so this
   works against the real scaffolder backend, not just the hermetic test
   harness. The result: a generated app's `app.tsx`/`main.tsx`/`app-shell.tsx`
   contain only the imports and calls for capabilities that were actually
   selected - no dead conditionals survive into the generated repository.

3. **A dedicated step removes unselected capability directories.**
   `template.yaml`'s `pruneCapabilities` step runs `fs:delete` (a built-in
   scaffolder action) between `fetchBase` and `publish`:

   ```yaml
   - id: pruneCapabilities
     action: fs:delete
     each: ['notifications', 'i18n', 'observability']
     if: ${{ not (each.value in parameters.capabilities) }}
     input:
       files:
         - src/capabilities/${{ each.value }}/**
   ```

   This is the **single source of truth** for which capability ids are
   composed - `packages/template-validation`'s tests parse this step out of
   `template.yaml` rather than hardcoding a second copy of the list, so the
   two cannot silently drift the way `copyWithoutTemplating`/
   `copyWithoutRender` did in Phase 1.1 (see app-template.md's "Steps"
   section for that incident).

   Because step 2 already stripped the imports/call sites for anything not
   selected, deleting the now-unreferenced directory is safe: nothing in the
   generated repository imports from a path that no longer exists. This is
   verified directly (not just assumed) by
   `packages/template-validation/src/capabilityComposition.test.ts`'s
   dangling-import check.

4. **Feature packs may add routes through the same templated route tree.**
   `src/routeTree.gen.ts` is committed (TanStack Router's generated route
   manifest, needed so `npm run typecheck` works before a build regenerates it
   - see app-template.md). The feature-pack route imports and route types are
     guarded by the same Nunjucks selection blocks and the pack's route module
     is pruned when unselected. Infrastructure capabilities continue to mount
     into documented always-present extension points.

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
