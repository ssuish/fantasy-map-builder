# Verification evidence

Read this procedure before committing a change, completing a task, reusing a receipt, or claiming acceptance.

## Commit and task checks

1. Identify observable behavior and affected consumers. Run meaningful affected checks before each coherent micro commit; a documentation change needs reference/scope review, not a new implementation-mirroring test.
2. At task completion run `npm run verify -- --task <slug>` from the root, plus relevant browser/integration checks. Verification runs lint, typecheck, unit tests, and builds sequentially and stops at the first failure. A failed result names skipped checks.
3. Inspect the receipt and task-specific evidence. Report exact commands, failures, skips, and limits. Finish only when required checks passed or the remaining blocker is explicitly reported.

Receipts live at ignored `docs/agents/verification/<slug>/STATUS.md`. Reuse requires matching Git HEAD and working-tree fingerprint; after a commit, the old receipt is historical. The verifier replaces only the selected task receipt and never reads, validates, creates, or appends history. Retired `--phase`, `--progress`, and `--next` flags are rejected; use a milestone event for narrative.

## Evidence boundaries

| Evidence | What it establishes |
|---|---|
| Root task receipt | Recorded lint/typecheck/unit-test/build outcomes at a specific tree. |
| Browser interaction/smoke | Tested presentation and interactions in the named browser/build. |
| Hardware benchmark | Timing on the explicitly agreed machine/protocol. |
| Deployed integration/recovery | Exercised provider behavior and data-safety gates. |
| Issue acceptance | Shared status backed by its required evidence. |

The current Chromium smoke uses software rendering; it is not GPU performance proof. Future terrain correctness, Firefox determinism, and final hardware timing follow technical design and #2/#3. The owner deferred the performance baseline until final QA preparation (#24); native development timings remain diagnostic. A task receipt or history entry does not close an issue or establish pilot acceptance.

## Privacy and migration

Receipts record hashes, Git metadata, check names, exit codes, durations, and skips; keep narrative and raw application output out. Private files are never read for fingerprint contents. Report sandbox failures and retry the required check through the normal escalation mechanism.

Old `docs/agents/build-logs/<slug>/STATUS.md` receipts remain historical and unmoved. CI uploads the new verification receipt; browser, deployment, and recovery evidence remain separate. Log significant task milestones with [the history procedure](build-log-template.md) rather than coupling history to verification.
