# Repository Guidelines

## Project Structure & Module Organization

The root npm workspace contains `atlas/` (React, PixiJS, and Vite), `atlas-cms/` (Strapi), and `packages/contracts/` (shared static-map contract). Use the root `package-lock.json` and run workspace commands from the repository root. App-specific instructions live in each app's `AGENTS.md`. Keep shared code in focused packages rather than duplicating contracts.

## Build, Test, and Development Commands

Run `npm ci` at the root. Use `npm run dev:web` and `npm run dev:cms` for local apps; use `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run verify -- --task <slug>` for checks. `docker compose up --build` starts the local CMS, PostgreSQL, and object store. Run relevant checks before submitting changes and report checks that could not be run.

## Coding Style & Naming Conventions

Follow the formatter, linter, and language conventions adopted by the project when they are introduced. Use descriptive, consistent names: `PascalCase` for component or type names where the language convention calls for it, and `camelCase` for values and functions. Keep modules small and format files consistently; avoid adding a second formatter or linter without a clear need.

## Testing Guidelines

Put tests beside their implementation or in the app's test directory. Cover observable behavior and relevant edge cases, including shared contracts and health routes. Run affected tests and include the exact command in the pull request.

## Commit & Pull Request Guidelines

Write concise, imperative commit subjects that describe the change. Pull requests should explain the motivation and implementation, list validation performed, link related issues when applicable, and include screenshots for user-facing visual changes.

## Configuration & Secrets

`CREDENTIALS.md` and all `.env` variants except `.env.example` are private. Do not read, search, quote, copy, stage, or transmit their contents. Check file names or ignore status without opening them when needed. Keep these files out of version control and Docker build contexts. Add only placeholder values to `.env.example` files and document required variables there.

## Agent skills

### Issue tracker

Issues live in GitHub Issues; use `gh`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.

### Framework and cloud skills

- For PixiJS work in `atlas/`, start with `atlas/.agents/skills/pixijs/SKILL.md`; it routes to the relevant PixiJS skill. Use only the skills relevant to the task.
- For Strapi work in `atlas-cms/`, use `atlas-cms/.agents/skills/strapi-docs-mcp/SKILL.md` and current Strapi documentation.
- For Google Cloud Run or `gcloud` work, use the matching skill under `.agents/skills/` (notably `cloud-run-basics` and `gcloud`). Use other Google Cloud architecture, alerting, or Well-Architected skills only when the task calls for them.
- `skills-lock.json` in each app records installed skill sources. Do not treat it as an application dependency lockfile.
- Installed skills and `.codex/` are local-only. When absent, use current official documentation and the tracked setup instructions.

## Plan files

- When Plan mode produces an implementation plan, save its final version as `docs/agents/plans/<slug>/PLAN.md`. Use a short lowercase kebab-case slug from the plan name; create the directory if needed. Include the goal, scope, implementation steps, and validation criteria. Give the file path in the final response.
- When asked to implement an existing plan, find its `PLAN.md` under `docs/agents/plans/` by name or slug and use it as task context. If Plan mode does not permit file writes, provide the plan in the response and save it when write access resumes.

## Build evidence

- Run `npm run verify -- --task <slug>` to write a concise, Git-ignored status under `docs/agents/build-logs/<slug>/STATUS.md`. Reuse a result only if Git HEAD and the working-tree fingerprint still match; otherwise rerun affected checks. Never put secrets or raw application logs in the status file.

## Agent workflow

- Use the primary GPT-6 Sol agent for planning, architecture, ambiguity
  resolution, integration decisions, and final synthesis.
- Delegate clear, bounded, independently verifiable implementation, research,
  test, script, and batch tasks to `luna_worker` when delegation saves primary
  agent work or supervision.
- Use one Luna worker by default. Use two only when the assignments are genuinely
  independent; do not create parallel workers for overlapping exploration or
  implementation.
- Use medium reasoning or higher for every Luna implementation task. Use high
  reasoning for security-sensitive code, persistence and publication workflows,
  concurrency, cross-service integration, or performance-critical map-engine
  work. Low reasoning is permitted only for mechanical read-only lookup, simple
  script supervision, or repetitive batch work with no design or code changes.
  Luna workers must not spawn additional agents.
- Give each worker a concise brief containing its objective, working directory,
  relevant files and context, authorized actions, owned files when editing, and
  completion checks. Prefer `fork_turns="none"` when the brief is sufficient.
- Require every worker result to state status, summarize the outcome, cite
  concrete evidence, report validation performed, and identify any remaining
  blocker or decision.
- Keep final integration and user-facing conclusions with the primary agent.
  Reconcile worker output against current repository state before accepting it.
- Low reasoning is the primary-agent default. For architecture, broad planning,
  difficult debugging, or security-sensitive work, select medium intelligence in
  the Codex UI or launch Codex with
  `-c 'model_reasoning_effort="medium"'`.
