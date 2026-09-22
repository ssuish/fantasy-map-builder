# Repository Guidelines

## Project Structure & Module Organization

Keep application code, assets, and tests in clearly named top-level directories (for example, `src/`, `public/`, and `tests/`). Place tests beside their implementation or in the established test directory, and keep shared utilities in a focused module rather than duplicating them. The repository currently has no checked-in source files or project manifest, so confirm the intended layout with the maintainers before introducing a framework-specific structure.

## Build, Test, and Development Commands

No build or development commands are defined in the repository yet. Once a package or build system is added, document its canonical commands here and in its manifest (for example, `npm run dev`, `npm run build`, and `npm test`). Run the relevant checks before submitting changes and report any checks that could not be run.

## Coding Style & Naming Conventions

Follow the formatter, linter, and language conventions adopted by the project when they are introduced. Use descriptive, consistent names: `PascalCase` for component or type names where the language convention calls for it, and `camelCase` for values and functions. Keep modules small and format files consistently; avoid adding a second formatter or linter without a clear need.

## Testing Guidelines

There is no test framework or coverage policy configured yet. Add tests with the framework chosen for the project, name test files clearly (such as `*.test.ts` or `test_*.py`), and cover observable behavior and relevant edge cases. Include the exact test command in the pull request.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so no established commit convention could be confirmed. Write concise, imperative commit subjects that describe the change. Pull requests should explain the motivation and implementation, list validation performed, link related issues when applicable, and include screenshots for user-facing visual changes.

## Configuration & Secrets

Keep credentials and local-only settings out of version control. Provide safe example configuration with placeholder values and document required environment variables when the application setup is added.

## Agent skills

### Issue tracker

Issues live in GitHub Issues; use `gh`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
