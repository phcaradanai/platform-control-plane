# ADR 0001: Backstage as the App Factory control plane

## Status

Accepted (Phase 1)

## Context

We need a way for developers to self-service the creation of new Platform
MFE Applications: enter metadata, get a GitHub repository from a
controlled skeleton, and have it show up in a searchable catalog -
without a platform team manually creating each repository.

Eventually these applications will be composed at runtime via Module
Federation into a "Super App" shell, with capabilities (auth, RBAC,
dashboards, etc.) added through Nx generators. None of that runtime
composition exists yet.

## Decision

Use Backstage as the **control plane only**: Software Catalog + Software
Templates (Scaffolder) + GitHub integration, backed by PostgreSQL in
production. Backstage is responsible for:

- presenting a governed, form-based way to request a new application
  (curated capability list, restricted repository host, fixed default
  branch - no arbitrary input)
- creating the GitHub repository and pushing a minimal, buildable
  TypeScript skeleton
- registering the result in the Software Catalog

Backstage is explicitly **not** responsible for, in this phase: running
the generated applications, Module Federation, Nx capability composition,
the Super App shell, Keycloak/authN-authZ for end users, deployment, or
anything under the prompt's "Out of Scope" list. Those become later
phases, layered on top of the `platform-app.json` contract this phase
establishes.

## Why not build a custom internal tool instead?

Backstage already solves the governed-self-service problem: the
Scaffolder's built-in `fetch:template`, `publish:github`, and
`catalog:register` actions cover the entire Phase 1 workflow without
custom code. A bespoke tool would have to reimplement catalog storage,
a template form UI, GitHub repo creation, and RBAC-readiness from
scratch. Building on Backstage means Phase 2+ (auth, permissions,
observability, org structure) has a well-documented extension path
instead of being invented from zero.

## Why the control plane and not the end-user Super App

Backstage's UI is aimed at developers/platform engineers, not the
end users of the applications it helps create. The App Factory's job is
to produce and register applications; what those applications look like
at runtime (Module Federation host/remotes, the Super App shell) is a
separate concern with a separate audience and lifecycle, and is
deliberately decoupled so the control plane can evolve (new templates,
new capabilities) independently of the runtime shell.

## Consequences

- Every capability the platform wants to offer must eventually be
  expressible as a curated, enum-restricted template parameter -
  arbitrary package installation from the form is explicitly disallowed
  by the Security Constraints, which shapes how future capabilities get
  added (curate first, then implement).
- `platform-app.json`'s `capabilities` array is the durable contract
  between this phase and the future Nx composition phase: whatever is
  requested here must eventually be satisfiable there.
- Because we preserve Backstage's generated architecture rather than
  forking it, upgrading to newer Backstage releases stays a normal
  dependency bump rather than a merge conflict with custom core changes.
