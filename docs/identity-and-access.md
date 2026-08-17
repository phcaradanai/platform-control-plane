# Identity and access

This guide covers access to the Backstage control plane. It does not define
end-user authentication for generated applications; those applications use
the separate `@platform/sdk` adapter contract.

## Sign-in modes

- **Local default:** `auth.providers.guest` is enabled and the sign-in page
  offers Guest. No real identity provider is required to explore Catalog or
  inspect the App Factory form.
- **Optional local GitHub:** enable both `auth.localGithubEnabled` and the
  `auth.providers.github.development` block in `app-config.local.yaml`, with
  `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET` exported.
- **Production configuration:** `auth.environment` is `production`, Guest is
  explicitly removed, and GitHub OAuth uses the `production` provider block.
  The configured resolver requires a matching Catalog User entity.

The full OAuth setup is in [GitHub integration](github-integration.md).

## Backstage permission policy

`packages/backend/src/permissions/policy.ts` implements two operator roles:

- **Platform Admin** — membership in `group:default/platform-admins`; allowed
  all Backstage permissions handled by the policy.
- **Developer** — any other signed-in user; allowed the Catalog browsing and
  App Factory actions needed to create an application, but not privileged
  template-management or destructive Catalog operations.

Unauthenticated requests are denied. This policy governs the control plane; it
does not enforce permissions inside a generated application.

## Provisioning production identities

Use `scripts/provision-identities.mjs` to generate the production org file from
known GitHub logins and groups. For example:

```bash
node scripts/provision-identities.mjs \
  --users "alice:platform-team;bob:platform-team,platform-admins" \
  --output examples/org.provisioned.yaml
```

Run the consistency check before committing a generated org file:

```bash
node scripts/provision-identities.mjs --check --output examples/org.provisioned.yaml
```

The production catalog imports `examples/org.provisioned.yaml`, not the local
Guest fixture in `examples/org.yaml`.

## Generated applications

Backstage sign-in does not flow automatically into a generated app. A product
must supply a real auth adapter/host and enforce authorization in its backend.
Until then, the generated SDK reports auth and permissions as unavailable and
fails permission checks closed. See [Backend integration boundaries](backend-integration.md).
