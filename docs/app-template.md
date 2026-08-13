# Platform MFE Application Template

`templates/platform-mfe-app/template.yaml` implements the **Platform MFE
Application** scaffolder template, registered in the catalog at
`/create` via the file location documented in
[catalog-model.md](./catalog-model.md).

## Form fields

| Section              | Field                                   | Notes                                                                                                                |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Application identity | `name`, `title`, `description`, `owner` | `name` is pattern-restricted to a URL-safe slug; `owner` uses the built-in `OwnerPicker` restricted to `kind: Group` |
| Repository           | `repoUrl`                               | Built-in `RepoUrlPicker`, `allowedHosts: [github.com]` only                                                          |
| Repository           | `repoVisibility`                        | `private` (default) or `public`                                                                                      |
| Application metadata | `lifecycle`                             | `experimental` or `production`                                                                                       |
| Application metadata | `mode`                                  | `platform-mfe`, `standalone`, or `standalone-and-mfe`                                                                |
| Capabilities         | `capabilities`                          | Multi-select checkboxes, restricted to the 15 curated identifiers below                                              |

The default branch is **not** a form field - it is hardcoded to `main` in
the `publish` step's `defaultBranch` input, per the spec.

### Curated capabilities

```text
authentication, profile, rbac, dashboard, settings, reports, history, audit-log,
notifications, tenant, theme, i18n, observability, desktop-ready,
mobile-ready
```

This is a closed enum in `template.yaml` - the form cannot submit any
value outside this list, and there is no free-text field for package
names or install commands anywhere in the template. Authentication, Profile,
RBAC, Dashboard, and Settings are frontend Feature Packs with real generated
routes, navigation, screens, interactions, and tests; see
[feature-packs.md](./feature-packs.md).

Three platform capabilities (`notifications`, `i18n`, `observability`) and
five frontend Feature Packs (`authentication`, `profile`, `rbac`, `dashboard`,
`settings`) are **composed** into the generated application's code; the
remaining seven selections remain recorded only in `platform-app.json`. See
[capabilities.md](./capabilities.md)
and [feature-packs.md](./feature-packs.md).

### `mode` has real runtime meaning (Phase 5)

Unlike the seven recorded-only capabilities above, `mode` is not just
metadata: the generated app's own `main.tsx` resolves it against whatever
platform host is present at boot (see
[platform-sdk.md](./platform-sdk.md#standalone-vs-hosted) and
[ADR 0005](./adr/0005-runtime-mode-boundary.md)). In particular, **the
form's default, `platform-mfe`, requires a platform host to boot at all**

- no Super App shell exists yet, so a freshly scaffolded app left at the
  default mode shows a "Platform host required" screen instead of its UI on
  `npm run dev`, until either a real host exists or `platform-app.json`'s
  `mode` is changed to `standalone` or `standalone-and-mfe`. This is
  intentional (a mode that never fails without a host would carry no real
  meaning), but it is a deliberate DX tradeoff worth knowing before picking
  `platform-mfe` for an app you intend to develop standalone today.

## Steps

```text
fetchBase           -> fetch:template   render templates/platform-mfe-app/skeleton
pruneCapabilities    -> fs:delete       remove unselected composed platform capabilities
pruneFeaturePacks    -> fs:delete       remove unselected feature-pack source and route files
publish              -> publish:github  create + push the GitHub repository (defaultBranch: main)
register             -> catalog:register register catalog-info.yaml in the new repo
```

All five are Backstage built-in actions; no custom scaffolder action was
implemented, per the spec's preference for built-ins.

`pruneCapabilities` (added in Phase 4) deletes
`src/capabilities/<id>/**` in the fetched working directory for each of
`notifications`, `i18n`, and `observability` that wasn't selected. The
following `pruneFeaturePacks` step removes both
`src/feature-packs/<id>/**` and `src/routes/<id>.tsx` for unselected
`dashboard` and `settings` packs. See [capabilities.md](./capabilities.md)
and [feature-packs.md](./feature-packs.md) for the full composition model.

`fetchBase` passes `copyWithoutTemplating: ['.github/workflows/**']`.
Without this, the skeleton's `.github/workflows/ci.yml` would be run
through the same `${{ ... }}` template engine Backstage uses for
scaffolder expressions, which is the same delimiter GitHub Actions
expressions use - `${{ failure() }}` / `${{ github.repository }}` in the
workflow file would be evaluated against the scaffolder's context and
fail the render (`Unable to call 'failure', which is undefined or
falsey`) instead of being copied verbatim.

**Phase 1.1 finding:** the installed
`@backstage/plugin-scaffolder-backend` version's `fetch:template` action
handler only wires the _newer_ `copyWithoutTemplating` input into the
copy-without-rendering behavior - `copyWithoutRender` is still accepted by
the action's schema (so no validation error) but is silently a no-op. The
template originally used `copyWithoutRender`, which passed every hermetic
test in `packages/template-validation` (that test suite reimplements its
own copy-skip logic rather than exercising the real handler) but failed
the first real scaffolder task run against this backend version. Fixed by
switching to `copyWithoutTemplating`; the test suite's helper and
assertions were renamed to match.

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

`runtime.status` is always `not-configured` - no Module Federation runtime
is installed or wired up by this phase. As of Phase 4, `notifications`,
`i18n`, and `observability` are composed into `src/capabilities/` when
selected, while Authentication, Profile, RBAC, Dashboard, and Settings are
composed into `src/feature-packs/` (see [capabilities.md](./capabilities.md)
and [feature-packs.md](./feature-packs.md)); the other seven curated
capabilities remain recorded only. The generated README explicitly
lists what was generated, which requested capabilities are composed versus
recorded only, how to run validation (`npm ci && npm run typecheck && npm
run build`), and that Module Federation integration is a later phase.

The generated app also vendors two shared packages as tarballs under
`vendor/` (`@platform/ui` for UI primitives, `@platform/sdk` for the
platform-facing identity/auth/permissions/tenant/navigation/runtime
contracts - see [platform-sdk.md](./platform-sdk.md)), copied byte-exact
via `copyWithoutTemplating: ['vendor/**']` rather than templated.

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
  `copyWithoutTemplating` is doing its job

## Live end-to-end verification (Phase 1.1)

The `/api/scaffolder/v2/dry-run` endpoint (and, equivalently, the
`/create/edit` browser dry run, which calls the same endpoint) remains
blocked on Windows by a path-joining defect: it always prepends the
project's own drive letter onto the resolved temp workspace path, even
when that path is already absolute - producing `ENOENT ... lstat
'D:\C:\Users\...\skeleton'` or, with `TMP`/`TEMP` redirected onto the same
drive, `ENOENT ... lstat 'D:\D:\...\skeleton'`. This was re-confirmed in
Phase 1.1 and is a Backstage/OS interaction, not a defect in this
template; there is no known workaround short of a non-Windows host.

That gap no longer blocks end-to-end confidence: the **real** task
execution endpoint (`POST /api/scaffolder/v2/tasks`, the same one the
`/create` UI's "Create" button calls) does not share the dry-run
endpoint's workspace-path construction and was exercised successfully,
including a live `publish:github` repository creation and
`catalog:register`. See `BACKSTAGE_APP_FACTORY_PHASE_1_REPORT.md`'s
"Phase 1.1 Verification Closure" section for the run.
