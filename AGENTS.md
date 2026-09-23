# Repository Guidelines

## Project Structure & Module Organization

`atlas/` is the PixiJS 8 and Vite TypeScript frontend. `atlas-cms/` is the Strapi 5 TypeScript backend. Each app has its own `package.json` and `package-lock.json`; run npm commands from the app directory. Place tests beside their implementation or in an established test directory. Shared packages and a root workspace have not been created; confirm their layout before introducing one.

## Build, Test, and Development Commands

Frontend: `cd atlas && npm run dev`, `npm run lint`, and `npm run build` (lint, TypeScript, Vite). Backend: `cd atlas-cms && npm run dev`, `npm run build`, and `npm run start`. No root build command or test script exists yet. Run relevant checks in the affected app and report checks that could not be run.

## Coding Style & Naming Conventions

Follow the formatter, linter, and language conventions adopted by the project when they are introduced. Use descriptive, consistent names: `PascalCase` for component or type names where the language convention calls for it, and `camelCase` for values and functions. Keep modules small and format files consistently; avoid adding a second formatter or linter without a clear need.

## Testing Guidelines

Neither app has a test script or coverage policy yet. Add tests with the framework chosen for the affected app, name test files clearly (such as `*.test.ts`), and cover observable behavior and relevant edge cases. Include the exact test command in the pull request.

## Commit & Pull Request Guidelines

Write concise, imperative commit subjects that describe the change. Pull requests should explain the motivation and implementation, list validation performed, link related issues when applicable, and include screenshots for user-facing visual changes.

## Configuration & Secrets

`CREDENTIALS.md` and all `.env` variants except `.env.example` are private. Do not read, search, quote, copy, stage, or transmit their contents. Check file names or ignore status without opening them when needed. Keep these files out of version control; `.codexignore` is an agent context hint, not a substitute for Git ignore rules. Add only placeholder values to `.env.example` files and document required variables there.

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

## Agent workflow

- Use the primary GPT-5.6 Sol agent for planning, architecture, ambiguity
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
