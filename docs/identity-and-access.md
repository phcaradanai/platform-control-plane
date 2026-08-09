# Identity and Access

This describes the control plane's own operator-facing identity and
permission model: who can sign in to this Backstage instance, and what
they're allowed to do once signed in. It replaces the guest-only,
allow-all-permissions setup from earlier phases.

**This is not the same identity system generated applications use.** See
["Not the same identity as generated apps"](#not-the-same-identity-as-generated-apps)
below.

## Sign-in

- **Local development** (`app-config.yaml`): the guest provider stays on,
  unchanged from earlier phases - `auth.providers.guest: {}`. There is no
  real identity to sign in with locally unless you opt in to GitHub OAuth
  (see `app-config.local.yaml.example`).
- **Production** (`app-config.production.yaml`): guest sign-in is
  disabled - `auth.providers.guest: null` deletes the base config's guest
  provider from the merged config rather than leaving it as an empty
  object (Backstage's config merge treats an overriding `null` as "unset
  this key"; verified with the real config loader in
  `packages/template-validation/src/productionConfig.test.ts`). GitHub
  OAuth is the only provider, using the
  `usernameMatchingUserEntityName` resolver **without**
  `dangerouslyAllowSignInWithoutUserInCatalog`. This means: a GitHub
  sign-in only succeeds if the account's username matches an existing
  catalog `User` entity's name. Sign-in itself is the access gate - an
  arbitrary GitHub account, even one with access to this org's
  repositories, cannot sign in unless someone has already provisioned a
  matching `User` entity (see "Provisioning users and admins" below).
- Production requires `BACKSTAGE_ENV=production` (or `--config
  app-config.production.yaml`) to be set at deploy time for this overlay
  to load at all - see `docs/getting-started.md`'s "Known limitations"
  for the current state of deployment tooling (there is none yet in this
  phase; this file documents the config that a future deploy step will
  use).

### Sign-in page (frontend)

The backend's auth providers above are only reachable if the sign-in page
actually offers them. `packages/app/src/modules/sign-in/SignInPage.tsx`
overrides the app plugin's built-in sign-in page (which hardcodes
`providers: ['guest']` regardless of environment - see
`node_modules/@backstage/plugin-app/dist/extensions/DefaultSignInPage.esm.js`)
with one that reads `auth.environment` - a frontend-visible config key
owned by `@backstage/plugin-auth-backend` itself (`visibility: frontend`
in its schema) - and offers:

- `development` (`app-config.yaml`): Guest **and** GitHub.
- anything else, including unset (`app-config.production.yaml` sets it to
  `production`): GitHub only - no Guest button is rendered, matching the
  backend having no guest provider to answer it.

Platform Admin / Developer are **not** separate login buttons - they stay
post-login roles derived from `PlatformAccessPolicy`
(`packages/backend/src/permissions/policy.ts`) reading catalog group
membership, unchanged by this.

## Permission policy

`packages/backend/src/permissions/policy.ts` (`PlatformAccessPolicy`)
replaces `permission-backend-module-allow-all-policy`. Two roles:

- **Platform Admin** (`group:default/platform-admins` membership, via
  `PolicyQueryUser.info.ownershipEntityRefs`): allowed everything.
- **Developer** (any other signed-in user): allowed an explicit list of
  catalog-browsing and template-running permissions - everything a
  developer needs to use the App Factory end to end (browse the catalog,
  open a template, run `/create`, have `catalog:register` register the
  result). Deny-by-default for everything else, including catalog entity
  delete/refresh/validate, catalog location delete, and scaffolder
  template management - those are Platform Admin actions.
- **No signed-in user**: denied everything. In practice the backend's
  default auth policy already rejects unauthenticated requests to most
  APIs before the permission policy is even consulted; the policy's own
  `!user` branch is defense in depth, consistent with `@platform/sdk`'s
  fail-closed contract for unavailable capabilities (see
  `docs/platform-sdk.md`).

**Why "any signed-in user = Developer" instead of gating on
`platform-team` membership too:** in production, sign-in itself already
requires a matching catalog `User` entity (see above) - there is no path
to being signed in without already being a known, provisioned identity.
Adding a second group check on top would be redundant complexity for no
additional safety in this phase. If a future phase needs finer-grained
developer tiers, that's a new decision to make deliberately, not a gap in
this one.

### Provisioning users and admins

The catalog only ingests entities from locations, so "adding a user"
means producing the right org-data file. The clean path is
`scripts/provision-identities.mjs` (no dependencies, runs with plain
`node`):

```bash
# One-time input file (gitignored/kept out of the repo):
cat > org.identities.json <<'EOF'
{"users":[
  {"github": "alice", "groups": ["platform-team"]},
  {"github": "bob",   "groups": ["platform-team", "platform-admins"]}
]}
EOF

node scripts/provision-identities.mjs \
  --input org.identities.json --output examples/org.provisioned.yaml

# Or inline for quick changes:
node scripts/provision-identities.mjs \
  --users "alice:platform-team;bob:platform-team,platform-admins"
```

The script validates everything the sign-in resolver and permission
policy depend on:

- entity names must be **lowercase GitHub logins** (the
  `usernameMatchingUserEntityName` resolver matches the GitHub profile's
  login against the entity name, so the entity name must be the exact
  login),
- groups must be a known group (`platform-team`, `platform-admins` -
  adding a group is a deliberate policy decision),
- no duplicates; the emitted YAML is validated by the same strict parser
  the catalog uses (regression-tested in
  `packages/template-validation/src/identityProvisioning.test.ts`).

`examples/org.provisioned.yaml` is the **production** org-data file
(committed, generated by the script with no input = groups only, i.e.
nobody can sign in and nobody is an admin until users are provisioned).
Production's catalog location imports it instead of the dev
`examples/org.yaml`, so the local `guest` fixture never appears in the
production catalog. `--check` re-renders from the same input and fails
if the file drifted or was hand-edited - run it in CI:

```bash
node scripts/provision-identities.mjs --check --output examples/org.provisioned.yaml
```

### Adding an admin

Add the person's GitHub login to the group list of an entry in the
provisioning input above with `platform-admins` in `groups`, regenerate,
and commit the updated `examples/org.provisioned.yaml`. The
`usernameMatchingUserEntityName` resolver requires `metadata.name` to
match the GitHub login exactly. Nobody is a Platform Admin by default -
the group exists but starts empty.

### What's covered vs. deliberately deferred

Covered: real sign-in (GitHub OAuth, config-driven, mirrors the existing
`integrations.github` PAT pattern from `docs/github-integration.md`), a
real permission policy scoped to Catalog and Scaffolder actions, and
production config that can't silently fall back to guest/allow-all.

Deliberately not built in this phase (see the project's Phase 3.1 scope):
Keycloak or any other external IdP, a tenant system, generated-app
end-user auth, enterprise IAM/SSO, or conditional (resource-scoped)
permission rules - every decision in `PlatformAccessPolicy` is a
definitive ALLOW or DENY, not a condition to evaluate per-entity. Real
organization/team data (who's actually in `platform-team` vs.
`platform-admins`) is still the same placeholder-in-`examples/org.yaml`
pattern documented in `docs/catalog-model.md`, not a live org sync.

## Not the same identity as generated apps

This file is about **who can operate this Backstage control plane**
(create apps, browse the catalog, administer the App Factory). It has
nothing to do with **who can use a generated application** at runtime -
that's `@platform/sdk`'s `useAuth()`/`usePermissions()` contract (see
`docs/platform-sdk.md`), which today has no real provider behind it in
standalone mode (fails closed) and will eventually be backed by whatever
the platform-hosted runtime provides.

The two are deliberately separate contracts with no shared code or
imports: a control-plane operator's Backstage identity is not a
generated app's end-user identity, and this phase does not build a
bridge between them. A generated app's `platform-app.json` records that
`authentication` was *requested* as a capability (see
`docs/app-template.md`); it says nothing about how this control plane's
own operators sign in, and vice versa.

## Verification

Hermetic (CI):

- `packages/backend/src/permissions/policy.test.ts` - unit tests for
  admin allow-all, developer allow-list, developer deny-by-default, and
  unauthenticated deny.
- `packages/backend/src/permissions/signInResolver.test.ts` - the
  production sign-in gate: `usernameMatchingUserEntityName` hands the
  GitHub username to the catalog lookup and never requests a
  catalog-bypass fallback unless `dangerouslyAllowSignInWithoutUserInCatalog`
  is explicitly set (which the production config does not do).
- `packages/template-validation/src/productionConfig.test.ts` - loads
  `app-config.yaml` + `app-config.production.yaml` through Backstage's
  real config loader (env substitution + merge semantics, the same
  pipeline as `backstage-cli config:print`): the merged production
  config has **no guest provider at all**, GitHub sign-in is configured
  without the dangerous flag, and the production catalog imports the
  provisioned org file rather than the dev `guest` fixture.
- `packages/template-validation/src/identityProvisioning.test.ts` -
  exercises `scripts/provision-identities.mjs`: rendering, validation
  rejections, `--check`, and that its output parses with the catalog's
  strict YAML parser.
- `packages/template-validation/src/appConfig.test.ts` and
  `productionConfig.test.ts` additionally assert `auth.environment` is
  `development` in `app-config.yaml`, `production` in
  `app-config.production.yaml`, and that the real config-loader merge
  carries the production value through (not left at the base
  `development`).
- `packages/app/src/modules/sign-in/SignInPage.test.tsx` - renders the
  actual sign-in page component (via `renderInTestApp`, so real Router +
  API wiring, not a shallow render) under each `auth.environment` value
  and asserts the Guest button/card is present only for `development`,
  while GitHub is present in every case.
- `packages/app/e2e-tests/sign-in.test.ts` - real dev server, real
  browser (Playwright, part of `yarn test:e2e:smoke` and the CI `e2e`
  job): loads `/` and asserts both the Guest and GitHub sign-in options
  are visible, proving GitHub sign-in is reachable from the UI, not only
  configured in the backend. Production's GitHub-only behavior is **not**
  exercised in a real browser - the provider list is decided entirely by
  frontend config (`auth.environment`), so a live check would only need a
  second frontend process on another port with
  `auth.environment: production`, not a deployed PostgreSQL/GitHub OAuth
  app; that second server just hasn't been added yet. Today it's covered
  hermetically only: `SignInPage.test.tsx` renders the real component
  under `auth.environment: production` and asserts no Guest button, and
  the config tests above assert the production file itself sets it.

Known gap: local development's GitHub button is visible even without the
`app-config.local.yaml.example` opt-in overlay (see "Sign-in" above) -
clicking it in that state hits an unconfigured provider and fails. This
matches the "local development **may** offer GitHub" scope (not "must
work out of the box") but is worth knowing before you click it.

Live (Phase 3.1 closure run, real backend + real GitHub):

- **Production boot** (`app-config.production.yaml`, PostgreSQL, real
  GitHub OAuth app credentials):
  - `GET /api/auth/guest/start?env=production` -> **404** - there is no
    guest provider in production, so guest sign-in cannot be used.
  - `GET /api/auth/github/start?env=production` -> 302 to
    `https://github.com/login/oauth/authorize` carrying the real
    registered `client_id`, `redirect_uri` pointing at the backend's
    callback, and `read:user user:email` scope.
  - **Real GitHub OAuth sign-in** (actual account completing the consent
    flow in a real browser): while the account had no catalog `User`
    entity, the sign-in failed with "Failed to sign-in, unable to
    resolve user identity" - the catalog gate rejected an unprovisioned
    account. After provisioning the same account via
    `scripts/provision-identities.mjs` (as `platform-admins`), the
    sign-in succeeded: identity `user:default/<login>` with
    `ownershipEntityRefs` including `group:default/platform-admins`.
  - `POST /api/permission/authorize` with the real signed-in token:
    every privileged permission (`catalog.entity.delete`,
    `catalog.location.delete`, `scaffolder.template.management`,
    `catalog.entity.validate`, `catalog.entity.refresh`) returned
    **ALLOW**.
- **Developer role** (dev boot with a test-only overlay pointing the
  guest provider at a fixture catalog user in `platform-team`; the same
  policy input any GitHub-signed-in non-admin has):
  - all 11 App Factory allow-list permissions (catalog read/create,
    location read/create/analyze, template parameter/step read,
    action execute, task create/read/cancel) returned **ALLOW**;
  - all 5 privileged permissions returned **DENY**;
  - an authorize request with **no token at all** returned **401** (the
    backend's default auth policy rejects unauthenticated requests
    before the permission policy is consulted).
- The local guest development flow, the App Factory create flow, the
  generated apps, and the full test/CI suite are unchanged and green.
