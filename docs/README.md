# Fantasy Map Builder Documentation

The repository contains atlas/, atlas-cms/, and packages/contracts/. Phase 0 has a local walking skeleton and a verified read-only staging prototype.

## Runbooks

Use [runbooks/README.md](runbooks/README.md) for local setup, staging deployment, resource inventory, and routine operations.

- [runbooks/local-development.md](runbooks/local-development.md): local Compose services and checks.
- [runbooks/staging-deployment.md](runbooks/staging-deployment.md): Phase 0 Hosting, R2, Cloud Run, and Neon staging procedure.
- [runbooks/inventory.md](runbooks/inventory.md): verified resources, endpoints, identities, and secret names.
- [runbooks/operations.md](runbooks/operations.md): health checks, incident triage, and maintenance boundaries.

## Project guidance

- [agents/build-log-template.md](agents/build-log-template.md): local verification evidence and freshness rules.
- [agents/codex-setup.md](agents/codex-setup.md): local model, worker, and skill setup.
- [product-spec.md](product-spec.md): agreed MVP behavior, scope, and acceptance criteria.
- [technical-design.md](technical-design.md): runtime architecture, persistence, publication, security, and testing.
- [data-model.md](data-model.md): Strapi types, operational tables, R2 layout, relations, and invariants.
- [implementation-plan.md](implementation-plan.md): phased delivery plan and exit checks.
- [agents/phase-1-readiness.md](agents/phase-1-readiness.md): next-phase interview decisions and unresolved gates.
- [../ARCHITECTURE.md](../ARCHITECTURE.md): current and planned system architecture.
- [../DESIGN.md](../DESIGN.md): future visual system; Phase 0 preview still uses prototype styling.
- [../CONTEXT.md](../CONTEXT.md): canonical domain glossary.
- [adr/](adr/): durable architectural decisions.

## ADR index

1. [0001-publish-map-as-one-unit.md](adr/0001-publish-map-as-one-unit.md)
2. [0002-use-low-cost-managed-deployment.md](adr/0002-use-low-cost-managed-deployment.md)
3. [0003-use-strapi-managed-google-oauth.md](adr/0003-use-strapi-managed-google-oauth.md)
4. [0004-publish-immutable-release-snapshots.md](adr/0004-publish-immutable-release-snapshots.md)
5. [0005-version-generated-terrain.md](adr/0005-version-generated-terrain.md)
