# GitHub Integration

## Current setup: personal access token (proof of concept)

`app-config.yaml` configures a single integration for `github.com`:

```yaml
integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}
```

1. Create a classic PAT at <https://github.com/settings/tokens> with at
   least the `repo` scope (required to create repositories and push code)
   and the `workflow` scope (required because the generated skeleton
   includes `.github/workflows/ci.yml`).
2. Export it before starting Backstage: `export GITHUB_TOKEN=ghp_...`
   (never commit it - `.env` and `*-credentials.yaml` are gitignored).
3. The token is redacted from logs automatically (Backstage's config
   loader marks it as a secret) and is never printed by the application.

The `publish:github` and `catalog:register` scaffolder actions, and the
`github:repo:create` / `github:repo:push` actions they use internally, all
read this integration - no additional per-action credentials are needed.

## Restricting the repository host

The Platform MFE Application template's `repoUrl` field uses
`RepoUrlPicker` with `ui:options.allowedHosts: [github.com]`, so users
cannot target any other Git host from the form. `integrations.github` in
`app-config.yaml` similarly only lists `github.com`.

## Migrating to a GitHub App (organization phase)

When repositories move under a GitHub organization, replace the
`token`-based integration with a GitHub App:

```yaml
integrations:
  github:
    - host: github.com
      apps:
        - $include: github-app-platform-control-plane.yaml
```

with a separate, gitignored `github-app-platform-control-plane.yaml`
containing the App ID, installation ID, client ID/secret, and private key
(see the [Backstage GitHub Apps
docs](https://backstage.io/docs/integrations/github/github-apps) for the
exact shape). This removes the need for a long-lived PAT, scopes access to
only the repositories the App is installed on, and is the recommended
production path. This migration is not implemented in Phase 1 - the
`token: ${GITHUB_TOKEN}` integration is intentionally left as the only
active configuration so the swap is a config change, not a code change.

## GitHub OAuth sign-in (optional)

`packages/backend/src/index.ts` registers
`@backstage/plugin-auth-backend-module-github-provider`. Registering it is
a no-op until `auth.providers.github` exists in config, so local
development is never blocked by missing OAuth credentials - it falls back
to the guest provider.

To enable it locally:

1. Create a GitHub OAuth App at
   <https://github.com/settings/developers> with callback URL
   `http://localhost:7007/api/auth/github/handler/frame`.
2. Export `AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`.
3. Copy `app-config.local.yaml.example` to `app-config.local.yaml` (it
   already includes the `auth.providers.github` block, commented out) and
   uncomment the `auth:` block. Leave it commented out if you're only
   using the guest provider - the block is required by the GitHub auth
   module's config schema once present, so uncommenting it without both
   env vars set will fail the backend on startup.

In production, add the equivalent `auth.providers.github.production` block
to your deployment's config and remove the `guest: {}` provider from
`app-config.production.yaml`'s `auth.providers` once real identities are
available.

## Security constraints honored

- No token, client secret, or private key is ever committed - only
  `${ENV_VAR}` references appear in tracked config files
  (`packages/template-validation` includes an automated check for this).
- The scaffolder template cannot accept an arbitrary repository host or
  owner outside what `allowedHosts` and the GitHub integration permit.
- `backend.auth.dangerouslyDisableDefaultAuthPolicy` is not set anywhere -
  the backend's default auth policy stays enforced.
