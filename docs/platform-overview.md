# Platform overview

The Frontend Standard Platform is a paved path for creating and extending
React applications. It centralizes the UI and application contracts that
should be consistent across products, while leaving business behavior with
the product team.

## What this repository provides

| Surface                 | What it does                                                                          | Where it lives                                  |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Backstage control plane | Runs Catalog, authentication for control-plane operators, permissions, and Scaffolder | `packages/app`, `packages/backend`, root config |
| App Factory             | Presents the Platform MFE Application form and creates/registers repositories         | `templates/platform-mfe-app/template.yaml`      |
| Shared UI               | Provides tokens, themes, accessible primitives, feedback states, and patterns         | `packages/platform-ui` (`@platform/ui`)         |
| Shared SDK              | Provides app identity, runtime, navigation, and provider adapter contracts            | `packages/platform-sdk` (`@platform/sdk`)       |
| Design System Portal    | Lets developers inspect the shared UI source in Storybook                             | `packages/platform-ui/src/catalog`              |
| Generated application   | Provides a React/Vite/TypeScript foundation for product code                          | `templates/platform-mfe-app/skeleton`           |

The control plane creates a repository; it does not serve as the generated
application's production host. The generated application is a separate Vite
project with its own API base URL, tests, and CI workflow.

## The golden path

1. Run the control plane and inspect the portal before designing new UI.
2. Open **Create** in Backstage and choose **Platform MFE Application**.
3. Select only the capabilities your product needs, using the
   [Feature Pack guide](capabilities.md) to check what is actually composed.
4. Submit the form to render the skeleton, publish it to GitHub, and register
   its `catalog-info.yaml`.
5. Run the generated application locally with `npm ci`, `npm run dev`, and the
   generated validation scripts.
6. Add business-domain routes, API clients, workflows, and product UX under
   `src/`; consume the platform packages instead of forking their foundations.
7. Connect real providers through the documented adapter/API boundaries.

## Two identities, two responsibilities

The Backstage control plane has an operator identity: local development uses
Guest, while production configuration uses GitHub OAuth and catalog-backed
users. That identity controls who may browse Catalog and run App Factory.

The generated application has a separate application-user contract exposed by
`@platform/sdk`. The default standalone adapters report authentication,
permissions, and tenant context as unavailable. Do not assume that signing in
to Backstage authenticates an end user of a generated application.

## What not to infer

The App Factory capability list is a controlled vocabulary with three
categories. The infrastructure capabilities `notifications`, `i18n`, and
`observability`, plus the eight frontend Feature Packs — Authentication,
Profile, Permission/RBAC, Dashboard, Settings, Reports, History, and Audit Log
— add generated code when selected. `theme` is always-on; `tenant`,
`desktop-ready`, and `mobile-ready` are recorded only. A generated Feature
Pack is frontend UX and a typed boundary, not a real provider, backend,
persistence layer, or compliance authority. See [Current platform status](status.md)
and the [Feature Pack guide](capabilities.md).
