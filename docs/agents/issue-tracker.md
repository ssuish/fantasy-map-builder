# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list`
- Edit an issue body: write the complete Markdown body to a temporary file, then run `gh issue edit <number> --body-file <path>`; read it back with `gh issue view <number> --json body`.
- Comment: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` detects it from this clone.

## Phase and readiness labels

`phase:0` through `phase:6` match `docs/implementation-plan.md`. `planned` means a
later phase, not the next implementation target. `ready-for-work` is reserved
for the next actionable gate; as of the Phase 0 handoff, that is dependency
triage issue #19. `ready-for-human` flags work that will require manual setup
when its phase begins. Do not infer completion from a label: use the issue's
acceptance criteria and observed build evidence.

Before moving the next phase into `ready-for-work`, run `/grill-with-docs`
against the live repository, glossary, ADRs, plan, and tickets. Resolve
missing or conflicting requirements and update dependencies first.

## Pull requests as a triage surface

**No.** PRs are not a triage surface by default.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.
