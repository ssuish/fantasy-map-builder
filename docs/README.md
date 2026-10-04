# Documentation

Current requirements and implemented behavior are separate. Start with the canonical document for the task; use live GitHub issues for acceptance/status and dated evidence for observed checks.

## Current design

- [Product specification](product-spec.md): private-pilot behavior and exclusions.
- [Technical design](technical-design.md): focused module boundaries, terrain representation, and measurement.
- [Data model](data-model.md): retained entities/invariants and open contract gates.
- [Architecture](../ARCHITECTURE.md): implemented prototype and planned topology.
- [Implementation plan](implementation-plan.md): retained issue sequence, authorization, and evidence gates.
- [Domain language](../CONTEXT.md), [ADRs](adr/), and [visual direction](../DESIGN.md).

## Agent procedures

- [Domain authority](agents/domain.md): choose the owning source and reconcile conflicts.
- [Workflow](agents/workflow.md): interviews, plans, delegation, micro commits, completion.
- [Exploration](agents/exploration.md): rg discovery and tree-sitter structure.
- [Verification](agents/verification.md): independent receipts and evidence limits.
- [Milestone history](agents/build-log-template.md): deterministic append-only local history.
- [Issue tracker](agents/issue-tracker.md): GitHub operations and labels.
- [Local setup](agents/codex-setup.md): machine-specific agent/tool configuration.

## Provenance and operations

[Pilot scope rationale](agents/private-pilot-scope.md), [confirmed Phase 1 decisions](agents/phase-1-decisions.md), [historical readiness interview](agents/phase-1-readiness.md), and [Phase 0 evidence](agents/phase-0-progress.md) are dated records, not substitute current requirements. Broad MVP snapshots are in the [tracked archive](archive/2026-10-04-agent-docs/README.md); other local notes/plans remain ignored.

Use [runbooks](runbooks/README.md) for local development, staging deployment, inventory, operations, and Strapi maintenance. These procedures own provider details and dated deployed evidence.
