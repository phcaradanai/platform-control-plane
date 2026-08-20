# ADR 0005: Runtime-mode boundary for standalone and platform-hosted execution

> **Historical record — see current documentation.** This ADR captures the
> decision and implementation boundary of its phase. For present behavior,
> read [Current platform status](../status.md), [Feature Pack guide](../capabilities.md),
> and [Frontend feature packs](../feature-packs.md).

## Status

Accepted (Phase 5)

> **Historical decision record:** This ADR preserves the decision and platform
> state of its phase. For present behavior, follow [Current platform status](../status.md),
> the [Feature Pack guide](../capabilities.md), and the [App Factory guide](../app-template.md).

## Context

Since Phase 1, `platform-app.json`'s `mode` field (`platform-mfe`,
`standalone`, or `standalone-and-mfe`) has been recorded verbatim from the
scaffolder form and had zero effect on the generated application:
`App()` always constructed `PlatformProvider` with its default
`runtimeMode` ("standalone"), regardless of what `mode` said. Separately,
`@platform/sdk`'s `usePlatformRuntime().runtimeMode` (`'standalone'` |
`'hosted'`) already existed as the _live_ runtime signal, but nothing
could ever produce `'hosted'` - there was no platform-hosted shell, and no
mechanism for one to tell a generated app it was hosted even if it
existed.

Phase 5's brief is to give `mode` real runtime meaning, establish a
boundary a future Super App runtime can plug into, and keep standalone
execution and the existing capability composition (Phase 4) working -
without building Module Federation remote loading, a Super App shell, a
runtime registry, or any of the real host-side infrastructure that
implies.

## Decision

1. **One boot-time resolution function decides everything:
   `resolvePlatformRuntime(mode, host)`**
   (`packages/platform-sdk/src/runtime/resolve.ts`), called once by the
   generated app's `main.tsx` before mounting:

   - `standalone` never uses a host, even if one is present - otherwise it
     would be behaviorally identical to `standalone-and-mfe`.
   - `platform-mfe` requires a host; throws
     `PlatformRuntimeUnavailableError` when none is present.
   - `standalone-and-mfe` uses a host when present, falls back to
     standalone otherwise.

   This makes the generated code **mode-agnostic**: the same `main.tsx`
   and `app.tsx` ship for every `mode` selection, with no new
   `{% if %}` branches in the skeleton - `mode`'s effect is entirely a
   runtime decision, not a scaffold-time one. This avoids duplicating the
   application per mode and avoids a host-inside-host architecture, both
   explicitly out of scope.

2. **The host boundary is a single well-known global, not an API
   surface.** A platform host publishes a `PlatformHostContext` (a
   `contractVersion` plus optional adapter overrides) at
   `window.__PLATFORM_HOST__` before the generated app's bundle runs.
   `detectPlatformHost()` reads and validates it, collapsing "absent" and
   "unrecognized `contractVersion`" to the same `null` - callers don't
   need to (and structurally can't) distinguish them. Nothing in this
   contract references Backstage, webpack, or Module Federation: it works
   identically whether the host is a `<script>` tag, an MF shared-scope
   trick, an iframe bridge, or - today, since none of those exist yet - a
   test harness. This is deliberately the same shape as `PlatformProvider`'s
   existing `adapters` override (ADR 0002): a host simply supplies the
   subset of adapters it backs, and every capability the SDK didn't get an
   override for keeps its standalone default.

3. **`platform-mfe` without a host fails clearly, not silently.**
   `main.tsx` catches `PlatformRuntimeUnavailableError` and renders
   `RuntimeUnavailable` - a plain, dependency-free fallback screen (no
   `@platform/ui`, no `PlatformProvider`, no router) precisely because it
   has to render correctly when none of the app's own providers mounted.
   The alternative - `platform-mfe` silently behaving like standalone
   outside a host - was rejected because it would make `mode` carry no
   real meaning, defeating the point of this phase. The DX cost is real
   and is documented, not hidden: `platform-mfe` is the form's default,
   so a freshly scaffolded app left at the default shows this fallback on
   `npm run dev` until a host exists or `mode` is changed. Changing the
   form's default was considered and rejected - it's a product/DX
   decision for a later phase to revisit with real usage data, not
   something this phase's verification forced.

4. **Hosted behavior is tested with a mock host, not the real shell.**
   `@platform/sdk/testing` (a separate subpath export, not part of the
   package's main entry point) provides `installMockPlatformHost()` for
   unit tests in the same JS realm. Playwright/browser-automation tests
   can't use it (test and page are different realms; adapter functions
   aren't serializable across `page.addInitScript()`'s argument boundary
   anyway), so the skeleton's `e2e/runtime-mode.spec.ts` constructs the
   mock host object directly inside the init-script body instead, keyed
   by the same `"__PLATFORM_HOST__"` string. Both paths exercise the exact
   same `detectPlatformHost()`/`resolvePlatformRuntime()` real code the
   generated app itself runs - no shell-shaped code is duplicated for
   testing.

## Consequences

- `mode` now has a real, observable effect: `standalone` and
  `standalone-and-mfe` apps boot normally with no host and report
  `runtimeMode: 'standalone'`; `standalone-and-mfe` and `platform-mfe`
  apps report `'hosted'` and pick up host-supplied adapters (e.g. `auth`
  becoming `'ready'` instead of `'unavailable'`) when a host is present;
  `platform-mfe` apps fail clearly with no host.
- The skeleton's shared `e2e/smoke.spec.ts` injects a minimal mock host
  for `platform-mfe`-mode apps in a `beforeEach` so its five existing,
  mode-independent assertions keep passing for every `mode` - the mode
  boundary itself is asserted separately in `e2e/runtime-mode.spec.ts`.
- Any adapter a host (or a test) supplies must return a stable
  (`Object.is`-equal) `getSnapshot()` reference until something actually
  changes, same as the existing standalone navigation adapter - violating
  this causes an infinite `useSyncExternalStore` render loop, not just an
  extra render. This is now documented on `PlatformAdapters` itself
  (`packages/platform-sdk/src/adapters/types.ts`), not just the one
  adapter that originally discovered it.
- Module Federation remote loading, a real Super App shell, a runtime
  registry, CodeScape integration, Keycloak, a tenant backend, and
  desktop/mobile shells remain entirely out of scope, unchanged from this
  phase's brief. A future host only needs to satisfy the
  `PlatformHostContext` shape at `window.__PLATFORM_HOST__` - nothing
  about how it loads the generated app is constrained by this ADR.
