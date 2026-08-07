# Catalog Model

## Entities

`catalog-info.yaml` at the repository root defines three entities:

```text
Domain:    internal-platform
System:    application-platform
Component: platform-control-plane
```

- **`internal-platform`** (Domain) - the top-level grouping for internal
  developer platform capabilities. Intentionally minimal: this phase does
  not invent a broader organization taxonomy.
- **`application-platform`** (System) - the App Factory system: Backstage
  acting as control plane for creating, registering, and cataloging
  Platform MFE applications. `spec.domain: internal-platform` links it
  under the domain.
- **`platform-control-plane`** (Component) - this Backstage instance
  itself. `spec.system: application-platform` links it under the system.

Every entity has a name, description, and owner, and the Component has a
lifecycle (`experimental`) and type (`website`).

## Owner

All three entities, plus the `platform-mfe-app` Template itself, are owned
by `group:default/platform-team`, defined in `examples/org.yaml`
(repurposed in Phase 1.1 from `create-app`'s stock `guests` group - the
file path is unchanged, only its content). This is a **clearly marked
placeholder** - there is no real GitHub organization or team available
yet. Replace `group:default/platform-team` with a real
`group:default/<team>` once organizational data is imported (see
`examples/org.yaml` for the pattern, or import from GitHub via
`https://backstage.io/docs/integrations/github/org`).

## How these entities get into the catalog

`app-config.yaml` (and `app-config.production.yaml`, which overrides
catalog locations entirely) registers:

```yaml
catalog:
  rules:
    - allow: [Component, System, API, Resource, Location, Domain]
  locations:
    - type: file
      target: ../../examples/org.yaml    # Group: platform-team
      rules:
        - allow: [User, Group]
    - type: file
      target: ../../catalog-info.yaml    # relative to packages/backend
      rules:
        - allow: [Domain, System, Component]
    - type: file
      target: ../../templates/platform-mfe-app/template.yaml
      rules:
        - allow: [Template]
```

Phase 1.1 removed `create-app`'s stock `examples/entities.yaml`
(`System:examples`, `Component:example-website`, `API:example-grpc-api`)
and `examples/template/template.yaml` (the sample Node.js template) along
with their catalog locations - they added no value once real platform
entities existed and made the catalog confusing to browse. Only
`examples/org.yaml` (now defining `platform-team`) remains from the
original stock examples.

`Domain` was added to the top-level `catalog.rules` allow-list because the
stock generated config only allows `[Component, System, API, Resource,
Location]` - without this addition the Domain entity would be silently
rejected by the catalog processor with a low-visibility "kind not allowed"
error. File location targets are resolved relative to the backend
process's working directory, which in local development is
`packages/backend` - hence the `../../` prefix.

## Generated application entities

Each application produced by the **Platform MFE Application** template
gets its own `catalog-info.yaml` (see
[app-template.md](./app-template.md)), registered in its own repository
via the `catalog:register` scaffolder step. Its `spec.system:
application-platform` links it back to this control plane's System,
so the catalog can show every generated application as part of the same
System even though each lives in a separate GitHub repository.
