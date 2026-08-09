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
  this key"; verified with `backstage-cli config:print` /
  `config:check`). GitHub OAuth is the only provider, using the
  `usernameMatchingUserEntityName` resolver **without**
  `dangerouslyAllowSignInWithoutUserInCatalog`. This means: a GitHub
  sign-in only succeeds if the account's username matches an existing
  catalog `User` entity's name. Sign-in itself is the access gate - an
  arbitrary GitHub account, even one with access to this org's
  repositories, cannot sign in unless someone has already added a
  matching `User` entity (see `examples/org.yaml`).
- Production requires `BACKSTAGE_ENV=production` (or `--config
  app-config.production.yaml`) to be set at deploy time for this overlay
  to load at all - see `docs/getting-started.md`'s "Known limitations"
  for the current state of deployment tooling (there is none yet in this
  phase; this file documents the config that a future deploy step will
  use).

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

### Adding an admin

Add a `User` entity to `examples/org.yaml` (or wherever your real org data
ends up being imported from) with `spec.memberOf: [platform-admins]`, and
`metadata.name` matching the person's GitHub username (the
`usernameMatchingUserEntityName` resolver requires this). Nobody is a
Platform Admin by default - the group exists but starts empty.

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

- `packages/backend/src/permissions/policy.test.ts` - unit tests for
  admin allow-all, developer allow-list, developer deny-by-default, and
  unauthenticated deny.
- Live `POST /api/permission/authorize` checks against a running backend
  (guest bearer token, which resolves to the Developer role via
  `platform-team` membership in `examples/org.yaml`): every allow-listed
  permission returned `ALLOW`, every admin-only permission returned
  `DENY`.
- `backstage-cli config:print`/`config:check` against `app-config.yaml` +
  `app-config.production.yaml` together, confirming `guest` is absent
  from the merged config and the config still validates against schema.
- A live scaffolder task (`fetch:template` -> `publish:github` ->
  `catalog:register`) submitted with a guest/Developer-role token,
  confirming the App Factory's create flow still works end to end under
  the new deny-by-default policy - not just under the old allow-all one.
- Full OAuth browser sign-in (an actual GitHub account completing OAuth
  consent) was **not** exercised - there is no registered OAuth app or
  browser session available in this environment, the same limitation
  `docs/github-integration.md` already notes for GitHub sign-in. What was
  verified: the backend boots cleanly with the GitHub provider configured
  (dummy credentials, schema-valid), and the config-level sign-in gate
  (`usernameMatchingUserEntityName` without the dangerous flag) is in
  place for production.
