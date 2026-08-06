# Platform MFE Application Template

`templates/platform-mfe-app/template.yaml` implements the **Platform MFE
Application** scaffolder template, registered in the catalog at
`/create` via the file location documented in
[catalog-model.md](./catalog-model.md).

## Form fields

| Section | Field | Notes |
| --- | --- | --- |
| Application identity | `name`, `title`, `description`, `owner` | `name` is pattern-restricted to a URL-safe slug; `owner` uses the built-in `OwnerPicker` restricted to `kind: Group` |
| Repository | `repoUrl` | Built-in `RepoUrlPicker`, `allowedHosts: [github.com]` only |
| Repository | `repoVisibility` | `private` (default) or `public` |
| Application metadata | `lifecycle` | `experimental` or `production` |
| Application metadata | `mode` | `platform-mfe`, `standalone`, or `standalone-and-mfe` |
| Capabilities | `capabilities` | Multi-select checkboxes, restricted to the 13 curated identifiers below |

The default branch is **not** a form field - it is hardcoded to `main` in
the `publish` step's `defaultBranch` input, per the spec.

### Curated capabilities

```text
authentication, rbac, dashboard, reports, history, audit-log,
notifications, tenant, theme, i18n, observability, desktop-ready,
mobile-ready
```

This is a closed enum in `template.yaml` - the form cannot submit any
value outside this list, and there is no free-text field for package
names or install commands anywhere in the template.

## Steps

```text
fetchBase  -> fetch:template     render templates/platform-mfe-app/skeleton
publish    -> publish:github     create + push the GitHub repository (defaultBranch: main)
register   -> catalog:register   register catalog-info.yaml in the new repo
```

All three are Backstage built-in actions; no custom scaffolder action was
implemented, per the spec's preference for built-ins.

`fetchBase` passes `copyWithoutRender: ['.github/workflows/**']`. Without
this, the skeleton's `.github/workflows/ci.yml` would be run through the
same `${{ ... }}` template engine Backstage uses for scaffolder
expressions, which is the same delimiter GitHub Actions expressions use -
`${{ steps... }}` in the workflow file would be evaluated against the
scaffolder's (empty) context and silently stripped out.

## What gets generated

```text
README.md
package.json
tsconfig.json
src/index.ts
catalog-info.yaml
platform-app.json
.env.example
.gitignore
.github/workflows/ci.yml
```

`platform-app.json` records the exact form selections in the shape
required by the spec:

```json
{
  "schemaVersion": "1.0",
  "id": "<name>",
  "title": "<title>",
  "mode": "<mode>",
  "owner": "<owner>",
  "capabilities": ["<selected>", "..."],
  "runtime": { "type": "module-federation", "status": "not-configured" }
}
```

`capabilities` is serialized with nunjucks's `dump` filter
(`${{ values.capabilities | dump }}`) rather than plain interpolation,
because plain interpolation of an array produces a comma-joined string
(`authentication,rbac`), not valid JSON.

`runtime.status` is always `not-configured` - this phase does not install
or wire up any capability or Module Federation runtime. The generated
README explicitly lists what was generated, which capabilities were
requested, which parts are placeholders, how to run validation
(`npm install && npm run typecheck && npm run build`), and that runtime
integration is a later phase.

## Automated validation

`packages/template-validation` (run via `yarn test`) renders the skeleton
with nunjucks configured exactly as Backstage's `SecureTemplater` does
(`${{ }}` delimiters, `autoescape: false`) and asserts:

- the template is valid YAML and passes Backstage's own
  `templateEntityV1beta3Validator`
- required fields, the `github.com` host restriction, and the curated
  capability enum all match this document
- every rendered file is free of unresolved `${{ ... }}` expressions
- `platform-app.json` parses as JSON and its `capabilities` array exactly
  matches the selected values
- `catalog-info.yaml` parses as YAML with the expected name/owner/
  lifecycle/system
- `.github/workflows/ci.yml` is copied byte-for-byte, proving
  `copyWithoutRender` is doing its job

Live verification via the backend's `/api/scaffolder/v2/dry-run` endpoint
(and, equivalently, the `/create/edit` browser dry run, which calls the
same endpoint) was attempted but is blocked in this environment by a
Windows-specific path-joining defect: the endpoint's temp workspace path
and the project's OS temp directory ended up on different drive letters,
producing `ENOENT ... lstat 'D:\C:\Users\...\skeleton'`. This is a
Backstage/OS interaction, not a defect in this template - the hermetic
render tests above exercise the same nunjucks rendering path without
depending on that endpoint. See the Phase 1 report for the full detail
and for the exact point at which live GitHub publishing verification
stopped due to the absence of a `GITHUB_TOKEN`.
