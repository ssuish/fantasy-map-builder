# Agent workflow

Read before planning/replanning a slice, coordinating workers, making commits, or completing a task.

## Ground and decide

1. Read current product scope, relevant technical/data design, domain terms, ADRs, and live issue acceptance. Inspect code through [exploration](exploration.md); distinguish implemented behavior, planned requirements, and observed evidence.
2. Before materially planning the next slice, invoke `/grill-with-docs` (grilling plus domain modeling). Ask decisions that cannot be inferred; batch related questions and wait for answers. Record terms in CONTEXT.md and hard-to-reverse trade-offs in ADRs. Finish when the owner confirms consolidated decisions, unresolved dispositions/owners/blocking status are explicit, and the authorized next step is clear.
3. Update each canonical meaning in its owning doc and revise issue acceptance only from confirmed decisions. Engineering details left open to implementation can be chosen within these constraints. Reopen product scope when a change would add behavior or contradict an ADR.

Save final implementation plans at ignored `docs/agents/plans/<slug>/PLAN.md`, including goal, steps, and validation. In read-only Plan mode provide the plan, then save it when implementation is authorized. When implementing a named plan, locate and read that file first.

## Delegate bounded work

The primary agent owns product/architecture planning, integration decisions, and final synthesis at its selected default settings. Use one `luna_worker` by default for bounded independently verifiable work; use two only for independent ownership. Follow available role configuration; do not claim a model/effort setting the role does not support. Workers must not spawn agents.

Give objective, working directory, relevant context, authorized actions, owned files, and completion checks. Tell workers others share the checkout and require adjustment around their changes. Require status, outcome, concrete evidence, validation, and remaining blockers. Prefer a self-contained brief with no full-history fork. Reconcile results against current files before accepting them.

## Commit and complete

A micro commit is one coherent reviewable change, not one tool call or file. Run meaningful affected checks first, inspect the diff, and stage explicit owned paths. Keep user changes separate and avoid broad staging. Use imperative subjects and professional prose for commit/PR/issue text. Each coherent action ends with its commit and reported validation; no push/merge/deploy is implied.

At task completion follow [verification](verification.md), run required cross-consumer checks, and report material limits. Append significant task milestones through [history](build-log-template.md); commits provide finer detail, so history need not mirror each commit. PRs explain motivation/result, actual checks and linked issues; visual changes include screenshots. Acceptance uses live issue criteria and exercised evidence, never a passing local check alone.
