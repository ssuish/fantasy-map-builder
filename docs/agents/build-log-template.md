# Local milestone history

Read this procedure after resolving a material scope/decision/architecture change or reaching an implementation task milestone, and when correcting earlier history. The ignored `docs/agents/build-logs/build-log.md` is append-only local provenance. Current product/design docs and live GitHub issues own requirements and status; receipts independently own check results.

## Append a milestone

1. Prepare sanitized structured JSON outside private configuration. Include a stable event ID, category, concise summary, and useful evidence references. Optional details explain trade-offs, failures, or limitations; omit raw application logs and unnecessary personal data.
2. Run `npm run log:change -- --input <event.json>` from the repository root. Inspect the success/error result. The script supplies UTC time, Git HEAD, branch, and dirty-state metadata and formats the append consistently.
3. Link the canonical changed doc, relevant issue/commit, or verification receipt. Finish when the milestone was appended exactly once or its write failure is explicitly reported.

```json
{
  "id": "agent-docs-harness-complete",
  "kind": "implementation",
  "summary": "Separated verification receipts from local milestone history.",
  "details": ["No feature implementation or hardware acceptance is claimed."],
  "references": ["scripts/verify.mjs", "docs/agents/verification/agent-docs-harness/STATUS.md"]
}
```

Categories are `scope`, `decision`, `architecture`, `implementation`, and `correction`. Record task milestones rather than every inspection, check, or micro commit. Include material failed/abandoned outcomes when they affect the task handoff. IDs identify events independently of timestamps and commit count.

## Corrections and contention

A correction uses a new ID, `kind: "correction"`, and `corrects` naming an existing event ID. For a legacy entry without an event ID, add a new milestone identifying the historical heading in its details and explaining the corrected observation. Preserve the earlier bytes.

The script validates input before append and rejects duplicate IDs, unknown fields, invalid correction targets, and concurrent lock contention. Retry a contended write after the other writer finishes; inspect a leftover lock before removing it after a confirmed interrupted process. History failure never blocks unrelated verification.

Legacy phase/receipt tables are frozen history, not current summaries. Preserve the existing log and historical receipts; never manually rewrite tables or entries. New logs contain milestones only. Local history is not transferred by Git and is never required by the agent harness or CI. No history entry grants scope approval or proves acceptance.
