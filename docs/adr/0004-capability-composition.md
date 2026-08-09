# ADR 0004: Capability composition for the generated application foundation

## Status

Accepted (Phase 4)

## Context

Since Phase 1, the App Factory's `capabilities` field has been a curated,
closed enum recorded verbatim into every generated app's
`platform-app.json` and nothing else - selecting `notifications` or
`i18n` had no effect on the generated repository beyond that JSON array.
`docs/app-template.md` and the generated README were explicit about this:
"selecting a capability here does not install or configure it yet."

Phase 4's brief is to turn a representative subset of that enum into real,
composable generated-application behavior, while explicitly not building
Module Federation/Super App runtime, CodeScape integration, Keycloak, a
tenant backend, or desktop/mobile support yet - those remain the later
phase `platform-app.json.runtime.status: "not-configured"` already points
at.

Two constraints shaped everything else:

1. **The skeleton ships a frozen, committed `package-lock.json`.**
   `packages/template-validation/src/vendorTarball.test.ts` and
   `template.test.ts` already pin this (generated CI runs `npm ci`, which
   fails if `package.json` and the lockfile disagree). A composed
   capability that needed a new npm dependency would require the lockfile
   to vary per capability selection - not achievable from a static,
   committed file without running `npm install` during the scaffolder
   task, which would mean executing arbitrary install-time code as part of
   provisioning. That's a real security/reproducibility cost this phase
   doesn't need to pay.
2. **`src/routeTree.gen.ts` is committed** (TanStack Router's generated
   route manifest), specifically so `npm run typecheck` works in generated
   CI before any build regenerates it. A capability that added or removed
   a top-level route would need a capability-specific route tree per
   selection combination - not statically representable for 13 capabilities
   with independent on/off state.

## Decision

1. **Three capabilities are composed: `notifications`, `i18n`,
   `observability`.** Each is implementable with zero new npm
   dependencies (reusing `@platform/ui` primitives already vendored into
   the skeleton, or plain React context), is frontend-only, and needs no
   new top-level route. The remaining ten stay recorded-only, most because
   a real version needs infrastructure this phase explicitly excludes
   (`authentication`/`rbac` need a real IdP, `tenant` needs a tenant
   backend, `desktop-ready`/`mobile-ready` need the Super App runtime).
2. **Composition happens in two steps of the existing `fetch:template` +
   built-in-actions pipeline, not a new custom scaffolder action.**
   - `fetch:template` already renders every skeleton file through nunjucks
     with `${{ ... }}` delimiters. Three base files
     (`src/app.tsx`, `src/main.tsx`,
     `src/components/layout/header.tsx`) gained
     `{% if '<id>' in values.capabilities %} ... {% endif %}` guards around
     each composed capability's import and mount point. Nunjucks block
     tags (`{% %}`) are unaffected by Backstage's `SecureTemplater`
     variable-delimiter override, so this works against the real
     scaffolder backend, not just the hermetic test harness that mirrors
     it in `packages/template-validation/src/renderSkeleton.ts`.
   - A new `pruneCapabilities` step uses the built-in `fs:delete` action
     (already registered by `@backstage/plugin-scaffolder-backend`, no new
     module needed) with `each`/`if` to delete
     `src/capabilities/<id>/**` for any composed capability not selected.
     `each`/`if` on scaffolder steps are core `NunjucksWorkflowRunner`
     features, not something this template invented.
3. **Each capability owns a self-contained directory,
   `src/capabilities/<id>/`**, with its own implementation and tests, only
   ever referenced from the three documented extension points. No composed
   capability's internals are visible to another's.
4. **`template.yaml`'s `pruneCapabilities` step is the single source of
   truth for "which ids are composed."** `packages/template-validation`
   parses that step's `each` list out of the real `template.yaml` rather
   than hardcoding a parallel list in test code - the same class of drift
   that let `copyWithoutRender` (Phase 1.1) pass hermetic tests while
   silently doing nothing against the real scaffolder backend.

## Consequences

- Selecting `notifications`, `i18n`, or `observability` now produces a
  generated repository with real, working, tested code for that
  capability - not just a JSON array entry. Not selecting one means its
  entire directory and every reference to it are absent from the
  generated repository; nothing dead ships.
- The other ten curated capabilities are unchanged from earlier phases:
  recorded in `platform-app.json`, no generated effect. `docs/capabilities.md`
  documents this split explicitly so it isn't discovered by reading
  source.
- A composed capability may never add an npm dependency or a top-level
  route while these two constraints hold. If a future capability
  genuinely needs either, it needs a different mechanism (e.g. a real
  install step, accepted as a deliberate scope/security tradeoff) - not a
  reason to bend this one.
- `requires`/`conflictsWith` between capabilities is not implemented as
  code: nothing in the composed set needs it, and the task scope favors
  the smallest maintainable foundation over speculative validation
  machinery. The `if:`-based prune mechanism is the natural place to add
  it (`if: ${{ not (each.value in parameters.capabilities) or ('other-id'
  in parameters.capabilities) }}`-shaped) when a real conflict exists.
- Module Federation/Super App runtime composition, CodeScape integration,
  Keycloak, a tenant backend, and desktop/mobile support remain entirely
  out of scope, unchanged from this phase's brief and consistent with
  ADR 0002 and ADR 0003's exclusions.
