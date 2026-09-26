# Local Codex setup

Project `.codex/` settings and installed `.agents/skills/` directories are intentionally Git-ignored. Root and app `AGENTS.md` files are tracked instructions; `skills-lock.json` files record the sources of locally installed skills. Restore the needed PixiJS, Strapi, and cloud skills before work that depends on them, or use current official documentation when a local skill is unavailable.

For this project, leave the primary agent's model, reasoning effort, context window, and compaction at Codex defaults. This setup does not claim an effective 1M-token context window. Configure four worker slots and GPT-5.6 Luna with high reasoning as the subagent default in `.codex/config.toml`:

```toml
[agents]
enabled = true
max_concurrent_threads_per_session = 4
default_subagent_model = "gpt-5.6-luna"
default_subagent_reasoning_effort = "high"
```

Use `luna_worker` for bounded feature implementation, tests, scripts, and other independently verifiable work. Its local agent file pins GPT-5.6 Luna at high reasoning and requires status, evidence, validation, and blockers. Use `ambiguous_implementer` for bounded feature work with substantial technical ambiguity; its local agent file pins GPT-5.6 Luna at max reasoning. Keep product and architecture decisions with the primary agent. Use `docs_researcher` for read-only repository and documentation research at high reasoning. None of these roles may spawn additional agents.

Possible repo-specific roles, if repeated work warrants separate agents:

- `map_engine_worker`: PixiJS rendering, camera behavior, and map interaction in `atlas/`. Require browser evidence and focused performance checks.
- `cms_worker`: Strapi routes, content types, and publishing behavior in `atlas-cms/`. Require current Strapi docs and route tests.
- `contract_worker`: Manifest schema and parser changes in `packages/contracts/`. Require compatibility checks across frontend and CMS consumers.
- `integration_reviewer`: Read-only review of cross-workspace changes, runtime behavior, and missing tests before final integration.

Prefer existing roles until these scopes recur often enough to justify separate instructions. Start a new Codex session after changing configuration and inspect its effective model and reasoning settings. See the [Codex subagents guide](https://learn.chatgpt.com/docs/agent-configuration/subagents), [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), and [GPT-5.6 Luna model page](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Plans live locally under `docs/agents/plans/<slug>/PLAN.md`; verification receipts live under `docs/agents/build-logs/<slug>/STATUS.md`. Both directories are ignored by Git, so transfer a plan explicitly when another clone or worktree needs it. GitHub issues hold shared progress across environments.

Neon MCP is installed in the ignored project `.codex/config.toml`, pinned to project `spring-meadow-23046405` with a project-scoped key. The Neon `staging` branch exists, but the ignored local `.neon` context points to `production`. Check `neon status` before any Neon mutation; do not copy the MCP credential or pull production connection strings into local env files without a task that needs them.
