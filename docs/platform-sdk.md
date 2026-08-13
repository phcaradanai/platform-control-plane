# `@platform/sdk`

`packages/platform-sdk` implements the **Platform SDK**: the first stable
contract generated applications use to talk to the future Application
Platform, mirroring how [`@platform/ui`](../packages/platform-ui) ships
shared UI. See [ADR 0002](./adr/0002-platform-sdk-contracts.md) for the
rationale.

## Scope

The SDK defines six contracts:

| Contract | Hook | Always available? |
| --- | --- | --- |
| Application identity | `usePlatformApp()` | Yes |
| Runtime information | `usePlatformRuntime()` | Yes |
| Navigation | `useNavigation()` | Yes (browser History API fallback) |
| Auth/session | `useAuth()` | No - reports `unavailable` until a provider is wired up; exposes action phase and return-path options |
| Permissions | `usePermissions()` | No - fails closed (`can()` returns `false`) until a provider is wired up |
| Tenant context | `useTenant()` | No - reports `unavailable` until a provider is wired up |

Identity, runtime info, and navigation are core infrastructure with no
external dependency, so they always work standalone. Auth, permissions,
and tenant are real platform capabilities this phase deliberately does
**not** implement (no Keycloak, RBAC backend, or tenant system yet) - the
SDK's job here is to define the shape those capabilities will have, and to
behave predictably in their absence, not to fake them. The Authentication,
Profile, and Permission/RBAC Feature Packs consume these contracts without
providing an identity provider or security authority.

## Usage

Wrap the app once, near the root, with the application's own
`platform-app.json` identity:

```tsx
import { PlatformProvider } from '@platform/sdk';
import { appInfo } from './lib/app-info';

export function App() {
  return (
    <PlatformProvider config={{ app: appInfo }}>
      {/* ... */}
    </PlatformProvider>
  );
}
```

The generated skeleton's actual `App` additionally passes `runtimeMode`
and `adapters` from `resolveAppRuntime()` (`src/lib/platform-runtime.ts`)
rather than leaving them at their standalone defaults - see "Standalone
vs. hosted" below for why.

Then, anywhere beneath it:

```tsx
import { useAuth, usePermissions, usePlatformApp } from '@platform/sdk';

function Toolbar() {
  const app = usePlatformApp();
  const auth = useAuth();
  const permissions = usePermissions();

  if (auth.status === 'unavailable') {
    return <p>{auth.reason}</p>;
  }

  return (
    <>
      <span>{app.title}</span>
      {permissions.can('reports.view') ? <ReportsLink /> : null}
      {auth.isAuthenticated ? (
        <button onClick={() => auth.signOut()}>Sign out</button>
      ) : (
        <button onClick={() => auth.signIn()}>Sign in</button>
      )}
    </>
  );
}
```

The generated skeleton demonstrates all six hooks on its home route
(`src/routes/index.tsx`, `PlatformCapabilities` component).

## Unavailable-capability contract

`auth`, `permissions`, and `tenant` share one shape:

```ts
{ status: 'ready' | 'unavailable'; reason?: string; /* ...capability-specific fields */ }
```

When `status` is `'unavailable'`:

- `reason` explains why, safe to render directly in fallback UI.
- `useAuth().signIn()` / `signOut()` reject with a
  `PlatformCapabilityUnavailableError`.
- `usePermissions().can(...)` always returns `false` - permission checks
  **fail closed**, never open, when nothing backs them.
- `useTenant()`'s `tenantId`/`tenantName` are `null`.

This is the "clear behavior when a platform capability/provider is
unavailable" every consumer can rely on, rather than each app inventing
its own null-checking convention.

When auth is ready, `useAuth()` also exposes `phase: 'idle' | 'pending' |
'error'`, an optional provider error, and `signIn({ returnPath })`. The return
path is a path-only UX hint for the provider; feature packs sanitize it to a
same-origin path and the provider/backend remains responsible for the real
redirect.

## Standalone vs. hosted

`usePlatformRuntime().runtimeMode` (`'standalone'` or `'hosted'`) is a
distinct concept from `platform-app.json`'s own `mode` field (the
scaffold-time choice of `platform-mfe` / `standalone` /
`standalone-and-mfe`): `runtimeMode` is *where the code is currently
executing*, `mode` is *what the app was configured for*. Phase 5 connects
the two with `resolvePlatformRuntime(mode, host)`
(`packages/platform-sdk/src/runtime/resolve.ts`), called once at boot by
the generated app's `main.tsx`:

| `mode` | No platform host detected | Platform host detected |
| --- | --- | --- |
| `standalone` | `runtimeMode: 'standalone'` | `runtimeMode: 'standalone'` (host ignored) |
| `platform-mfe` | throws `PlatformRuntimeUnavailableError` | `runtimeMode: 'hosted'`, uses host adapters |
| `standalone-and-mfe` | `runtimeMode: 'standalone'` | `runtimeMode: 'hosted'`, uses host adapters |

`standalone` never uses a host even if one is present - otherwise it
would be behaviorally identical to `standalone-and-mfe`. `platform-mfe`
requires one: `main.tsx` catches `PlatformRuntimeUnavailableError` and
renders a plain, dependency-free fallback
(`src/components/feedback/runtime-unavailable.tsx`) instead of mounting a
broken app - this is what "fail clearly and safely" means in practice. See
[ADR 0005](./adr/0005-runtime-mode-boundary.md) for the full design and
`docs/adr/0002-platform-sdk-contracts.md` for why this whole area of the
SDK exists.

### The host contract

A platform host (real or, today, only a test harness - no Super App shell
exists yet) publishes a `PlatformHostContext` at
`window.__PLATFORM_HOST__` (`PLATFORM_HOST_GLOBAL` in
`packages/platform-sdk/src/runtime/host-contract.ts`) before the
generated app's own bundle runs:

```ts
interface PlatformHostContext {
  contractVersion: 1;
  adapters?: Partial<PlatformAdapters>;
}
```

`detectPlatformHost()` reads and validates it, returning `null` for both
"nothing there" and "present but an unrecognized `contractVersion`" -
callers can't tell the two apart, and don't need to. This global is
deliberately the *entire* boundary: nothing in the SDK or the generated
app assumes Backstage, webpack, or Module Federation put it there, so a
later Super App runtime, a plain `<script>` tag, or an iframe bridge can
all satisfy it identically.

Any adapter the host's context omits keeps its standalone default -
exactly like `PlatformProvider`'s own `adapters` override today, just
sourced from the host instead of the app.

### Testing hosted behavior without a host

`@platform/sdk/testing` (a separate subpath, not exported from the
package's main entry point) provides `installMockPlatformHost()` for unit
tests - it writes directly to `globalThis`, so it only works when the test
and the "page" share a JS realm (e.g. a Vitest/jsdom test). For
Playwright/browser-automation tests, where the test runs in Node and the
page is a separate realm, construct the host object inside a
`page.addInitScript()` body instead, keyed by the same
`"__PLATFORM_HOST__"` string - see the generated skeleton's
`e2e/runtime-mode.spec.ts`. Either way, `getSnapshot()` on any adapter you
supply must return a stable (`Object.is`-equal) reference until something
actually changes, same as the standalone navigation adapter below -
returning a fresh object every call causes an infinite `useSyncExternalStore`
render loop, not just a wasted render.

## Adapters: the extension point

Every optional capability (`auth`, `permissions`, `tenant`) and navigation
is backed by an **adapter** - a small interface
(`packages/platform-sdk/src/adapters/types.ts`) the SDK calls through
`useSyncExternalStore`. `PlatformProvider` defaults every capability to
its standalone implementation (`packages/platform-sdk/src/adapters/standalone.ts`):
auth/permissions/tenant always report unavailable; navigation is backed by
`window.history`. A consuming app - or, later, a platform-hosted host -
can override any subset via `PlatformProvider`'s `adapters` config option,
without the SDK needing to know anything about what backs them.

Navigation is deliberately **router-agnostic**: the SDK never depends on
any specific router package. The generated skeleton bridges its own
TanStack Router instance to the `NavigationAdapter` interface in
`src/lib/platform-navigation-adapter.ts`, via the router's underlying
history object rather than its typed `navigate()` API, so the bridge only
needs a raw string path.

## Vendoring

`@platform/sdk` ships to generated apps the same way `@platform/ui` does:
built with `tsc`, packed with `npm pack`, and vendored at
`templates/platform-mfe-app/skeleton/vendor/platform-sdk-0.1.0.tgz`
(`"@platform/sdk": "file:./vendor/platform-sdk-0.1.0.tgz"` in the
skeleton's `package.json`). `template.yaml`'s `fetchBase` step already
copies all of `vendor/**` byte-exact
(`copyWithoutTemplating: ['vendor/**']`), so no template change was needed
to add a second vendored package.

`templates/platform-mfe-app/vendor-manifest.json` now records a
`sourceFingerprint` per vendored package (`@platform/ui` and
`@platform/sdk`), each a sha256 over that package's `src/**` and
`package.json` (see `computePackageFingerprint` in
`packages/template-validation/src/vendorFingerprint.ts`).
`packages/template-validation/src/vendorTarball.test.ts` checks, for each
vendored package, that: (1) the fingerprint still matches the source it
was built from, and (2) the tarball's actual sha512 matches what
`skeleton/package-lock.json` has pinned. Whenever `packages/platform-sdk`
changes:

1. `yarn workspace @platform/sdk build`
2. `npm pack` it from `packages/platform-sdk`
3. copy the resulting tarball over
   `templates/platform-mfe-app/skeleton/vendor/platform-sdk-0.1.0.tgz`
4. delete and regenerate `skeleton/package-lock.json` from scratch
   (`npm install` does not re-hash an existing `file:` dependency - this
   is the exact Phase 2.1 `EINTEGRITY` incident; see
   `BACKSTAGE_APP_FACTORY_PHASE_2_1_REPORT.md`)
5. recompute and update `sourceFingerprint` in `vendor-manifest.json`

## Out of scope (this phase)

No real Keycloak integration, RBAC backend, tenant system, Module
Federation, or Super App runtime is implemented here. The SDK defines the
contracts and standalone defaults those future phases will plug real
adapters into - it does not implement them.
