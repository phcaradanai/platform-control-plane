# GitHub integration

GitHub is used in two separate control-plane paths: App Factory repository
publishing and optional Backstage operator sign-in.

## App Factory repository access

`app-config.yaml` reads a `GITHUB_TOKEN` for the `github.com` integration. The
Platform MFE Application form also restricts `RepoUrlPicker` to `github.com`.

For a local publish, create a token with permission to create/push the target
repository and to include the generated GitHub Actions workflow, then export
it before starting the backend:

```powershell
$env:GITHUB_TOKEN = '<token>'
node .yarn/releases/yarn-4.13.0.cjs dev:backend
```

Do not commit the token or put it in tracked YAML. The `publish:github` and
`catalog:register` actions use the configured integration; no per-form token
field exists.

The current repository uses a personal-token integration. A GitHub App is a
future operational improvement, not a requirement for local boot.

## Optional local GitHub OAuth

Local development uses Guest by default. To offer GitHub sign-in locally, set
`AUTH_GITHUB_CLIENT_ID` and `AUTH_GITHUB_CLIENT_SECRET`, create/copy
`app-config.local.yaml`, and enable both:

```yaml
auth:
  localGithubEnabled: true
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
```

The GitHub OAuth app callback is:

```text
http://localhost:7007/api/auth/github/handler/frame
```

Do not enable only the frontend flag or only the backend provider block. The
sign-in page intentionally hides a local GitHub button unless both sides are
configured.

## Production operator sign-in

`app-config.production.yaml` sets `auth.environment: production`, removes the
Guest provider, and configures GitHub OAuth. The resolver requires the GitHub
login to match a catalog `User` entity, so provision operator identities before
expecting production sign-in. This is control-plane operator access, not
generated-app authentication. See [Identity and access](identity-and-access.md).
