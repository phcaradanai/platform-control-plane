# Backend integration boundaries

The frontend expresses contracts and states. Real systems remain the
authority for identity, authorization, persistence, audit integrity, and
compliance.

## Application-facing contract

`@platform/sdk` is the stable boundary between generated application code and
the platform host/provider. A generated app mounts `PlatformProvider` with its
`platform-app.json` identity and may supply adapters through the resolved
runtime:

```tsx
<PlatformProvider
  config={{
    app: appInfo,
    runtimeMode: runtime.runtimeMode,
    adapters: { navigation, ...runtime.adapters },
  }}
>
  <AppRoutes />
</PlatformProvider>
```

The current SDK adapters are:

| UX concern      | Frontend contract                        | Real authority                            | Current repository behavior                                     |
| --------------- | ---------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| Authentication  | `AuthAdapter`, `useAuth()`               | Identity provider/session service         | No generated-app provider; standalone is `unavailable`          |
| Permission/RBAC | `PermissionsAdapter`, `usePermissions()` | Authorization service/backend enforcement | No generated-app provider; standalone `can()` fails closed      |
| Tenant          | `TenantAdapter`, `useTenant()`           | Tenant directory/service                  | No provider; standalone is `unavailable`                        |
| Navigation      | `NavigationAdapter`, `useNavigation()`   | Application router or host                | Browser History fallback; generated app bridges TanStack Router |

The optional host contract is published at `window.__PLATFORM_HOST__` with
`contractVersion: 1`. The repository contains the resolver and test helpers,
but no production host runtime.

## Domain API integration

The generated app's `src/api/client.ts` is transport, not a backend. It uses
`VITE_API_BASE_URL` (default `http://localhost:8080/api`), applies JSON headers,
timeouts, cancellation, and a normalized `ApiError`. Add domain endpoints in
`src/api/` and call them through that client. Implement the real service,
authentication, authorization, persistence, and error semantics on the backend
side.

There is no generated backend and no current generic report/history/audit data
source interface. Until the platform publishes one, those are product-owned
API boundaries:

```text
Product report page  -> src/api/reports.ts       -> product report backend
Product history page -> src/api/history.ts       -> product event/application backend
Product audit page   -> src/api/audit-log.ts     -> real audit service
```

Use the same pattern for a product dashboard or settings page. Do not name a
product endpoint a platform contract merely because its page is visually
reusable.

## Feature Pack/provider map

The App Factory identifiers are not all implemented data integrations. This is
the safe interpretation of the current repository:

- **Authentication** → SDK auth adapter → real identity provider. The
  `authentication` selection is recorded only; it does not install a login
  page or provider.
- **Profile** → no current generated-app Profile Pack or profile adapter. An
  authenticated `PlatformUser` may expose display name/email, but a profile
  page and profile persistence are not provided.
- **Permission/RBAC** → SDK permissions adapter → backend/host authorization.
  The UI can hide or disable affordances, but the backend must enforce every
  permission.
- **Dashboard** → product dashboard API → product service. No generic
  dashboard data contract is currently shipped.
- **Settings** → product settings API or the control plane's separate Backstage
  user-settings plugin. No generated-app Settings Pack is shipped.
- **Reports** → product report data source → product backend. No generic report
  data-source contract is currently shipped.
- **History** → product history/event data source → event or application
  backend. No generic history contract is currently shipped.
- **Audit Log** → real audit data source → audit service. The frontend is not
  the authority for append-only integrity, retention, or compliance.

The exact selection/composition status is maintained in the
[Feature Pack guide](capabilities.md).

## Non-authority rules

Frontend code must not be treated as the authority for:

- authentication security or token validity;
- authorization enforcement or resource scoping;
- audit event integrity, ordering, retention, or compliance;
- persistence, transactionality, or idempotency;
- tenant isolation;
- report correctness or export authorization.

Send the relevant credentials/context through the approved provider or API
boundary, keep server-side checks in the real service, and render the result
using the shared states and interaction patterns.
