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

There is no generated backend. The Reports, History, and Audit Log Feature
Packs do provide typed frontend data-source interfaces, but those interfaces
are replaceable boundaries rather than backend services or authority. Until a
product connects them to real services, the API boundaries remain
product-owned:

```text
Product report page  -> src/api/reports.ts       -> product report backend
Product history page -> src/api/history.ts       -> product event/application backend
Product audit page   -> src/api/audit-log.ts     -> real audit service
```

Use the same pattern for a product dashboard or settings page. Do not name a
product endpoint a platform contract merely because its page is visually
reusable.

## Feature Pack/provider map

The eight frontend Feature Packs are shipped generated UX and typed frontend
boundaries. They do not themselves provide the production provider, backend,
persistence, security authority, or compliance guarantee behind those
boundaries:

- **Authentication** → `/authentication` session UX and SDK auth adapter → a
  real identity provider. Standalone remains `unavailable`; no generated-app
  provider is configured by default.
- **Profile** → `/profile` current-user UX → `PlatformUser` plus any
  product-owned profile API. It requires Authentication; profile persistence
  remains external.
- **Permission/RBAC** → `/rbac` permission-aware UX and SDK permissions
  adapter → backend/host authorization. The backend must enforce every
  permission and resource boundary.
- **Dashboard** → `/dashboard` summary/table/refresh UX → a product dashboard
  API. The pack does not provide platform-owned business data.
- **Settings** → `/settings` settings form and save UX → a product preference
  API or the control plane's separate Backstage user-settings plugin. The pack
  does not provide persistence.
- **Reports** → `/reports` catalog/search/run/result/export UX and
  `ReportsDataSource` → a product report service. The frontend boundary is
  shipped; reporting authority and export authorization remain external.
- **History** → `/history` activity/filter/detail/pagination UX and
  `HistoryDataSource` → a product event or application backend. The backend
  remains the source of truth.
- **Audit Log** → `/audit-log` audit inspection UX and `AuditLogDataSource` →
  a real audit service. It requires Authentication and RBAC, but provides no
  audit persistence, append-only integrity, retention, or compliance guarantee.

The App Factory rejects Profile or RBAC without Authentication and Audit Log
without both Authentication and RBAC before repository publication. The
generated registry also validates declared pack dependencies; no pack silently
imports an unselected pack.

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
