# Local build log

`npm run verify -- --task <task-slug>` writes the latest command receipt to the Git-ignored `docs/agents/build-logs/<task-slug>/STATUS.md` file and appends a verification activity entry to the canonical `docs/agents/build-logs/build-log.md`.

The Phase 0–6 names are historical labels from the broader MVP plan. Use `--phase <0-6>` only when the task genuinely matches a retained phase; otherwise omit it. The first-release scope and gates are in [private-pilot-scope.md](private-pilot-scope.md). The verifier never changes a phase status from a task receipt or from passing local checks.

## Canonical log

`build-log.md` is the local source of truth for observed phase progress and verification evidence. It contains:

- A current Phase 0–6 summary table with only `Not started`, `In progress`, `Blocked`, or `Complete` statuses.
- A separate task receipt table preserving historical `STATUS.md` evidence without treating task results as phase completion. A `passed` result is historical, not a freshness claim; inspect that receipt's HEAD and fingerprint before reuse.
- Append-only activity entries with the observed branch, exact checks and exit codes, skipped checks, limitations, blockers, and evidence paths.

Phase 0 is complete only because issue #1, the Phase 0 checklist, CI, Hosting, Cloud Run, and private R2 denial evidence support its acceptance. Later phase rows remain `Not started` until their own acceptance evidence is observed. Former Phase 4 Lore and Phase 6 public-launch work are outside the pilot; do not treat those rows as pilot gates. The pilot's final deployed and recovery gate is issue #24. Planned scope and passing local checks do not establish phase completion.

## Corrections and freshness

Never silently rewrite an activity entry or remove a failed attempt. Append a correction entry naming the exact entry being corrected, explain the changed observation, cite the new evidence, and update the phase summary to the current supported status. Routine typo fixes may be made in place when meaning does not change.

Receipt evidence is valid only while its Git HEAD and working-tree fingerprint match. The fingerprint includes staged and unstaged diffs plus content hashes for safe untracked files. `.env` variants and `CREDENTIALS` files are stat-only and never read for hashing. The verifier validates the canonical log before checks and again before writing a receipt; malformed logs fail closed and remain untouched. CI, deployment, review, recovery, and external system evidence must be recorded by their owning systems or procedures.

## Secret and output handling

The verifier records system metadata, hashes, command names, exit codes, durations, and concise evidence references only. It omits arbitrary `--progress` and `--next` text, environment values, credentials, tokens, and raw command output from receipts and the canonical log. Do not manually add secrets or unnecessary personal information to ignored logs.
