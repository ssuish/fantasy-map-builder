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

## Private pilot issue set

Use [private-pilot-scope.md](private-pilot-scope.md) as the current scope and the live issue body as the acceptance contract. #19 is the current ready-for-work dependency gate. Retained pilot tickets are #2–#4, #6–#10, #14–#15, and #24. Issues #5, #11–#13, #16–#18, and #20 were closed as `not planned` for this pilot; their descriptions are historical and do not gate pilot work. A later public launch needs a new scope decision and ticket.

## Phase and readiness labels

`phase:0` through `phase:6` are legacy labels from the broader `docs/implementation-plan.md`. They are useful for historical grouping, not a current pilot dependency graph. `planned` means a later task, not the next implementation target. `ready-for-work` is reserved
for the next actionable gate; currently that is dependency triage issue #19. `ready-for-human` flags work that will require manual setup
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
