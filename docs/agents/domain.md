# Domain and document authority

Read when changing terminology, requirements, architecture, or implementation sequencing.

| Concern | Canonical source |
|---|---|
| Product behavior and exclusions | [Product specification](../product-spec.md) |
| Technical interfaces, representation, measurement | [Technical design](../technical-design.md) |
| Retained entities and data invariants | [Data model](../data-model.md) |
| System topology/current versus planned | [Architecture](../../ARCHITECTURE.md) |
| Delivery dependencies and design gates | [Implementation plan](../implementation-plan.md) |
| Domain language | [CONTEXT.md](../../CONTEXT.md) |
| Durable rationale | [ADRs](../adr/) |
| Actionable acceptance/shared status | Live GitHub issues; [tracker procedure](issue-tracker.md) |

Keep each meaning in its owning source and link it from consumers. Code/configuration establishes implemented behavior; current docs describe requirements/targets. Conflicts need reconciliation, not an implicit precedence guess. Owner-confirmed decisions constrain scope; planned checks and local history are not acceptance evidence.

This repository has one domain context. Capture terms in CONTEXT.md, without implementation detail. Capture durable trade-offs sparingly in ADRs. [Pilot scope provenance](private-pilot-scope.md) and [Phase 1 decisions](phase-1-decisions.md) explain why current requirements changed; they are not extra parallel specifications.

Read [archived documents](../archive/2026-10-04-agent-docs/README.md) only for historical rationale or an explicitly reopened deferred feature. They do not participate in normal planning/implementation acceptance.
