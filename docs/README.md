# Platform documentation

This directory describes the behavior that exists on `main`. Start with the
root [README](../README.md) for the shortest path to a running control plane.

## Golden path

| Need                            | Guide                                                         |
| ------------------------------- | ------------------------------------------------------------- |
| Understand the platform         | [Platform overview](platform-overview.md)                     |
| Understand the architecture     | [Architecture](architecture.md)                               |
| Install and run locally         | [Getting started](getting-started.md)                         |
| Create an application           | [App Factory guide](app-template.md)                          |
| Choose capabilities correctly   | [Feature Pack guide](capabilities.md)                         |
| Add product/domain code         | [Business-domain development](business-domain-development.md) |
| Connect APIs and providers      | [Backend integration boundaries](backend-integration.md)      |
| Review shared UX                | [Design System Portal](design-system-portal.md)               |
| Change the platform             | [Platform contribution guide](platform-contribution.md)       |
| Diagnose a failure              | [Troubleshooting](troubleshooting.md)                         |
| Check what is current or future | [Current platform status](status.md)                          |

## Foundation references

- [Frontend standards](frontend-standards.md) — shared tokens, primitives,
  interaction rules, accessibility, and the generated-app boundary.
- [`@platform/sdk`](platform-sdk.md) — the application-facing contract and
  standalone behavior.
- [GitHub integration](github-integration.md) — App Factory repository access
  and optional control-plane GitHub OAuth.
- [Identity and access](identity-and-access.md) — operator sign-in and
  Backstage permission policy, which are distinct from generated-app end-user
  identity.
- [Catalog model](catalog-model.md) — the control-plane and generated-app
  catalog entities.

## Historical records

The repository also contains ADRs and phase reports. They preserve decisions
and verification evidence, but they are not current setup instructions. When a
historical record disagrees with a guide above, the implementation on `main`
and the current guide are authoritative.
