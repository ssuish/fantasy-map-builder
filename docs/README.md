# Fantasy Map Builder Documentation

The current repository uses `atlas/`, `atlas-cms/`, and `packages/contracts/`. Phase 0 has a local walking skeleton; the cloud staging exit checks remain open. Product and architecture sections below describe the intended MVP unless marked as implemented.

- [`staging-runbook.md`](staging-runbook.md): deployment prerequisites and Phase 0 staging checks.
- [`agents/build-log-template.md`](agents/build-log-template.md): local verification evidence and freshness rules.
- [`agents/codex-setup.md`](agents/codex-setup.md): local model, worker, and skill setup.

- [`product-spec.md`](product-spec.md): agreed MVP behavior, scope, and acceptance criteria.
- [`technical-design.md`](technical-design.md): runtime architecture, deep modules, persistence, publication, security, and testing.
- [`data-model.md`](data-model.md): Strapi types, operational tables, R2 layout, relations, and invariants.
- [`implementation-plan.md`](implementation-plan.md): phased delivery plan and exit checks.
- [`../CONTEXT.md`](../CONTEXT.md): canonical domain glossary.
- [`adr/`](adr/): durable architectural decisions and their trade-offs.

## ADR index

1. [`0001-publish-map-as-one-unit.md`](adr/0001-publish-map-as-one-unit.md)
2. [`0002-use-low-cost-managed-deployment.md`](adr/0002-use-low-cost-managed-deployment.md)
3. [`0003-use-strapi-managed-google-oauth.md`](adr/0003-use-strapi-managed-google-oauth.md)
4. [`0004-publish-immutable-release-snapshots.md`](adr/0004-publish-immutable-release-snapshots.md)

