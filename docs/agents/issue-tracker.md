# GitHub issue procedure

Read before inspecting or changing actionable acceptance, dependencies, labels, or shared status. Use `gh`; it detects this repository from the clone.

1. Read the relevant issue and comments with `gh issue view <number> --comments`. Compare live acceptance with canonical requirements and actual code/evidence.
2. Resolve contradictions before changing scope. Write complete multiline bodies/comments to temporary files and use `--body-file`; preserve actual newlines.
3. After a write, read it back and compare the intended body/status. Close only when that issue's required evidence and authorization are satisfied; report remaining gates.

Current scope is [product specification](../product-spec.md); dependencies/design gates are [implementation plan](../implementation-plan.md). Deferred closed issues remain historical. #19 and #27 are closed prerequisites; #2 is the next feature target after separate authorization. Read live issues before reusing this dated handoff.

Legacy `phase:0`–`phase:6` labels group history, not current scope. `planned` does not authorize implementation. `ready-for-work` requires an actionable, authorized task with resolved dependencies; `ready-for-human` identifies required manual setup. Labels and task receipts are not completion evidence.

PRs are not the default triage surface. Skill requests to publish/fetch a ticket use GitHub issues; obtain write authorization from the task/skill before sending external updates. Local history need not be automatically published.
