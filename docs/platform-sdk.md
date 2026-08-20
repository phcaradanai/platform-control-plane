# `@platform/sdk`

`@platform/sdk` is the application-facing contract between a generated app and
the platform runtime. It is deliberately independent of Backstage, routers,
and any particular identity provider.

## Hooks and status

| Contract       | Hook                   | Standalone behavior                                        |
| -------------- | ---------------------- | ---------------------------------------------------------- |
| App identity   | `usePlatformApp()`     | Always available from `platform-app.json`                  |
| Runtime        | `usePlatformRuntime()` | Always available after boot resolution                     |
| Navigation     | `useNavigation()`      | Browser History API fallback; apps may bridge their router |
| Authentication | `useAuth()`            | `status: unavailable` until OIDC configuration or a host adapter is supplied |
| Permissions    | `usePermissions()`     | `status: unavailable`; `can()` always returns `false`      |
| Tenant         | `useTenant()`          | `status: unavailable` until a tenant adapter is supplied   |

Unavailable auth actions reject with `PlatformCapabilityUnavailableError`.
The SDK does not invent a fake user, grant, or tenant.

Identity, runtime information, and navigation are core infrastructure with no
external dependency, so they always work standalone. The SDK defines
provider-neutral auth, permissions, and tenant contracts and ships a browser
OIDC adapter for generated applications; it still behaves predictably when no
provider is wired up. The Authentication, Profile, and Permission/RBAC
Feature Packs consume these contracts without moving security authority into
the frontend. The other Feature Packs likewise keep their production data and
service authority outside the SDK.

## Provider usage

The generated app mounts the provider once near the root:

```tsx
<PlatformProvider
  config={{
    app: appInfo,
    runtimeMode: runtime.runtimeMode,
    adapters: { navigation, ...runtime.adapters },
  }}
>
  {children}
</PlatformProvider>
```

Each optional capability is supplied through an adapter with a snapshot,
subscription, and (for auth) sign-in/sign-out methods. Auth adapters may also
provide a current bearer token and mark a session expired after a backend
`401`. A host can publish a versioned `window.__PLATFORM_HOST__` object with
partial adapters. During generated-app boot, runtime resolution selects a host
auth adapter before constructing the local OIDC adapter; the host adapter
therefore takes precedence and local OIDC restore/login does not start in a
hosted application. The SDK does not couple either path to Backstage or to a
particular provider.

## Generated application authentication

The generated skeleton creates `createOidcAuthAdapter()` when both
`VITE_AUTH_ISSUER_URL` and `VITE_AUTH_CLIENT_ID` are present. It is a public
OIDC browser-client flow using Authorization Code + PKCE; no client secret is
accepted or generated. Optional values configure the registered callback,
post-logout callback, scope, and provider-specific audience. The issuer's
discovery document must publish matching issuer, authorization, token, and
JWKS endpoints. Redirect URIs must be registered for the app origin, and the
provider must allow the browser's CORS requests.

The adapter keeps access, refresh, and identity tokens in memory. It keeps only
the short-lived state/nonce/PKCE transaction in `sessionStorage`, and restores
the current route's pathname, query, and hash through an OIDC `prompt=none`
round trip. The callback validates the transaction state and age, and return
paths are reduced to safe same-origin paths. An ID token is
verified against the discovery JWKS with an allowed signing algorithm and
issuer, client/audience, `azp` when required, nonce, and time-claim checks;
decoding a JWT payload alone is never treated as proof of identity. The
adapter refreshes an expired access token when possible and clears local state
on expiry, sign-out, or a backend `401`.

Identity-provider operations have a bounded timeout (10 seconds by default) and
accept cancellation. The generated API client applies its own timeout across
token acquisition and the API request, forwards caller cancellation, and
normalizes failures. API calls send a bearer token through the adapter; the
backend must validate that token and enforce authorization.

With no OIDC configuration, the generated app deliberately reports auth as
unavailable. In hosted mode, a supplied host adapter is selected before local
OIDC construction and may use a different session transport without changing
Feature Pack code. A failed silent restore settles into a signed-out/error
state with an explicit interactive retry and does not create a redirect loop.

## Runtime modes

The scaffold-time `platform-app.json.mode` and live `runtimeMode` are
different:

- `standalone` never uses a host;
- `platform-mfe` requires a compatible host and fails clearly without one;
- `standalone-and-mfe` uses standalone behavior without a host and hosted
  adapters when one is present.

The generated app catches `PlatformRuntimeUnavailableError` and renders a
fallback rather than mounting a broken application.

## Adapter boundaries

Use the SDK adapters only for the stable platform contract. A product's report,
history, audit, profile, settings, or dashboard API is not an SDK adapter in
the current implementation. Put those domain calls in `src/api/` and keep
their real authority in the product backend. See
[Backend integration boundaries](backend-integration.md).

The generated skeleton demonstrates the platform hooks on its home route
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
path is a path-only UX hint for the provider; feature packs preserve the
current nested pathname/query/hash where possible and sanitize it to a
same-origin path. The provider/backend remains responsible for the real
redirect.

## Standalone vs. hosted

`usePlatformRuntime().runtimeMode` (`'standalone'` or `'hosted'`) is a
distinct concept from `platform-app.json`'s own `mode` field (the
scaffold-time choice of `platform-mfe` / `standalone` /
`standalone-and-mfe`): `runtimeMode` is _where the code is currently
executing_, `mode` is _what the app was configured for_. Phase 5 connects
the two with `resolvePlatformRuntime(mode, host)`
(`packages/platform-sdk/src/runtime/resolve.ts`), called once at boot by
the generated app's `main.tsx`:

| `mode`               | No platform host detected                | Platform host detected                      |
| -------------------- | ---------------------------------------- | ------------------------------------------- |
| `standalone`         | `runtimeMode: 'standalone'`              | `runtimeMode: 'standalone'` (host ignored)  |
| `platform-mfe`       | throws `PlatformRuntimeUnavailableError` | `runtimeMode: 'hosted'`, uses host adapters |
| `standalone-and-mfe` | `runtimeMode: 'standalone'`              | `runtimeMode: 'hosted'`, uses host adapters |

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
deliberately the _entire_ boundary: nothing in the SDK or the generated
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

The App Factory copies `@platform/sdk` as
`vendor/platform-sdk-0.1.0.tgz`. After changing the SDK, build and pack it,
replace the skeleton tarball, regenerate the skeleton lockfile, update the
source fingerprint in `vendor-manifest.json`, and run template validation.
Generated applications do not resolve the monorepo workspace at runtime.
