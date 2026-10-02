# Phase 1 readiness interview

Recorded 2026-09-28 while organizing the Phase 0 handoff. This is a decision record, not a claim that Phase 1 implementation or performance acceptance has begun.

## Sources checked

Current `atlas/` and `atlas-cms/` code, `CONTEXT.md`, ADRs 0001–0004, `docs/product-spec.md`, `docs/technical-design.md`, `docs/data-model.md`, `docs/implementation-plan.md`, Phase 0 build evidence, and GitHub issues #2, #3, #7, and #19.

## Resolved decisions

- Resolve dependency triage issue #19 before starting Phase 1. Issue #2 is blocked by #19 and remains `planned`.
- Phase 1 and Phase 2 edit Maps in memory. Creator sign-in and durable Draft persistence begin in Phase 3.
- For a given generator algorithm version, identical seed and settings produce identical starting terrain on desktop Chromium and Firefox. Later algorithm versions may change output. [ADR 0005](../adr/0005-version-generated-terrain.md) records the compatibility boundary.
- [ARCHITECTURE.md](../../ARCHITECTURE.md) distinguishes deployed Phase 0 from planned MVP. [DESIGN.md](../../DESIGN.md) defines a new dark fantasy archive direction with shared Creator/Explorer tokens and different interface density; Phase 0 styling is a prototype.

## Still unresolved

- Choose the exact reference device or CI runner and run count for the existing p95 generation and brush budgets before Phase 1 performance acceptance. The user left this to be determined; no benchmark can be reported as passing until the setup and measurements are recorded.
- Issue #19 remains open. Current production-scope audit reports 22 moderate and one high Vite entry. CI built and health-checked the CMS image from the cleaned lockfile; publishing its digest and checking the new image in staging remain open. Upload and email integration checks remain separate outstanding work.

Before implementation, rerun `/grill-with-docs` against the then-current code and issue state. Resolve new contradictions rather than treating this dated interview as perpetual approval.

## Dependency evidence update — 2026-10-02

The dependency maintenance acceptance checks for issue #19 have now been exercised: Strapi 5.56.0 with reviewed runtime dependency versions, 23 CMS integration tests, final production image and PostgreSQL startup, isolated Neon candidate/previous-image compatibility, and staged Cloud Run/Firebase Hosting rollout. The fresh audit contains 21 package entries (3 high, 17 moderate, 1 low); runtime patches and residual development-tool exposure are documented in [strapi-safe-upgrade.md](../runbooks/strapi-safe-upgrade.md). The user accepted precise deployed mail delivery and durable R2 upload limitations for this dependency gate only. The live GitHub issue carries final closure status.

Phase 1 remains not started. Its benchmark setup and the fresh readiness interview remain necessary before implementation; dependency verification does not establish terrain performance, Creator readiness, authentication acceptance, or pilot data recovery.
