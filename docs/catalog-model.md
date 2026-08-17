# Catalog model

The Backstage Catalog describes the control plane and the applications that
the App Factory creates.

## Control-plane entities

The repository root `catalog-info.yaml` defines:

```text
Domain:    internal-platform
System:    application-platform
Component: platform-control-plane
```

The entities are owned by `group:default/platform-team` in the local
development organization file. `group:default/platform-admins` is a separate
group used by the backend permission policy.

The local catalog locations in `app-config.yaml` load:

- `examples/org.yaml` for development Users and Groups;
- `catalog-info.yaml` for the control plane Domain/System/Component;
- `templates/platform-mfe-app/template.yaml` for the App Factory Template.

The production overlay uses `examples/org.provisioned.yaml` instead of the
local Guest fixture. See [Identity and access](identity-and-access.md).

## Generated application entity

Every successful App Factory run creates a `catalog-info.yaml` in the new
repository and runs `catalog:register`. The generated Component links to the
`application-platform` System so applications appear under the same platform
in Backstage even though their source lives in separate repositories.

The generated repository's owner comes from the form and must resolve to a
Catalog Group. The repository annotation points to the GitHub owner/repository
selected in the form.

## Ownership boundary

Catalog ownership is control-plane metadata. It does not grant an end user
permission inside a generated application and is not a replacement for
product authorization. Keep operator identity and generated-app identity
separate; see [Backend integration boundaries](backend-integration.md).
