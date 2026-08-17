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
| Authentication | `useAuth()`            | `status: unavailable` until an auth adapter is supplied    |
| Permissions    | `usePermissions()`     | `status: unavailable`; `can()` always returns `false`      |
| Tenant         | `useTenant()`          | `status: unavailable` until a tenant adapter is supplied   |

Unavailable auth actions reject with `PlatformCapabilityUnavailableError`.
The SDK does not invent a fake user, grant, or tenant.

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
subscription, and (for auth) sign-in/sign-out methods. A host can publish a
versioned `window.__PLATFORM_HOST__` object with partial adapters. The SDK
contains this contract and test helpers; the repository does not include a
production host or identity provider.

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

## Vendoring

The App Factory copies `@platform/sdk` as
`vendor/platform-sdk-0.1.0.tgz`. After changing the SDK, build and pack it,
replace the skeleton tarball, regenerate the skeleton lockfile, update the
source fingerprint in `vendor-manifest.json`, and run template validation.
Generated applications do not resolve the monorepo workspace at runtime.
