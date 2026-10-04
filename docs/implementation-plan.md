# Private pilot implementation plan

This roadmap sequences the current [product specification](product-spec.md) and [technical design](technical-design.md). Live GitHub issue bodies own actionable acceptance and shared status; this document owns dependencies and design gates. Historical Phase 0–6 labels do not add requirements. Local history and passing verification receipts are not readiness or phase status authorities.

## Current handoff

As of the confirmed 2026-10-04 handoff: Phase 0 is a static staging prototype; #19 dependency maintenance and #27 readiness decisions are closed. On 2026-10-05 the owner approved a five-PR stack for #2 and requested implementation. #3 depends on its terrain and viewport interfaces. Recheck live issues and code before using this snapshot.

The authorized #2 editor lives at `/editor`, preserving the root static demo. The first feature PR targets `phase-1`; subsequent PRs target their predecessor and remain open for review. The owner excluded all provider actions. Firebase preview deployment is therefore limited to PRs targeting `stage`; feature-stack publication does not authorize deployment or a push to `stage`. Visual review and final hardware performance remain separate acceptance gates.

[Phase 1 decisions](agents/phase-1-decisions.md) preserve owner confirmation and risk ownership. Fixed measurement counts are settled; only final performance baseline provision/choice is deferred to final QA preparation. This deferral does not block implementation, but does block performance sign-off and pilot release (#24).

## Retained delivery sequence

| Order | Issues | Deliverable and prerequisite |
|---|---|---|
| Completed prerequisite | #19 | Dependency maintenance with explicitly limited upload/mail evidence; not pilot acceptance. |
| In progress | #2 | Authorized blank/generated in-memory terrain, deterministic derivation, viewport, contours, session replacement/recovery. Five dependent PRs against `phase-1`. |
| Then | #3 | Target-value Brushes, fixed map-space sampling/radius limits, continuous seams, dirty-neighbor updates, per-sample visibility. Uses #2 interfaces. |
| Then | #4, reduced #6 | Freehand Drawing, basic road/river Feature Strokes, fixed layers and session undo/redo. Remain in memory; #5 Symbol Stamps is deferred. |
| Contract gate | Before persistence | Confirm retained Canvas Document/release boundaries; source state has no rendering duplicates. |
| Then | Reduced #7 | Google/Strapi sign-in, invitation/ownership and one Map per Creator. |
| Then | #8 after #7 | Private terrain Draft saving/restoration. |
| Then | #9 after #8 | Save/restore complete retained content. |
| Then | #10 after #9 | Revision conflicts, stale-tab recovery, upload commit ordering/retries and failed-save preservation. |
| Then | Reduced #14 | Explicit immutable Public publication/republishing after Draft/ownership integration evidence. |
| Then | Reduced #15 | Anonymous stable-URL Published Version resolution and pan/zoom. |
| Before real data/invitations | #24 | Invitation controls, abuse limits, backup/retention ownership, timed Draft/Published restore and deployed journey. |

Closed #5, #11–#13, #16–#18, and #20 describe deferred historical work, not delivered features. Public launch requires a later scope decision/ticket.

## Design and acceptance gates

Before materially planning each next slice, use `/grill-with-docs` and domain modeling against current code, canonical docs, ADRs, relevant issues, and fresh evidence. Resolve product/architecture contradictions with the owner. Engineering defaults explicitly left to implementers do not require reopening settled product choices.

For #2/#3, implement the confirmed behaviors and bounded future harness in technical design. Record radius limits, stroke semantics, seed conversion, golden cases, screenshot tolerance, and context-recovery limits. Browser correctness and native diagnostics can precede final hardware QA. Visual acceptance requires owner review; final performance remains pending until the chosen baseline is exercised.

Before saving, confirm schema, revision, ownership, object validation, upload-before-manifest ordering, and failure preservation. Before publication, confirm immutable release encoding, expected Draft preconditions, pointer-switch rules, retries, and cleanup. Before real data, confirm invitation/access limit, backup owner/frequency/retention/recovery target, and reachable-object cleanup policy.

Required pilot evidence includes private Draft denial, saved Draft restore, two-tab conflict, missing-upload rejection, failed-save/publish preservation, and timed restoration of the current Published Version at its stable URL. Exercise the invited Creator and anonymous Explorer journey through existing staging providers. Preserve #19's accepted limitations as dependency-gate limitations only.

## Verification and work records

For each coherent micro commit, run meaningful affected checks and stage only owned changes. At task completion run root verification plus applicable browser/integration checks; record exact observed results and skipped checks. [Verification guidance](agents/verification.md) separates local receipts, browser correctness, hardware timing, and deployed acceptance.

Current requirements live here and in canonical docs; issue closure needs its own acceptance evidence. Use [the milestone logger](agents/build-log-template.md) for append-only local scope/decision/architecture/implementation history. A history entry neither authorizes scope nor proves acceptance.
