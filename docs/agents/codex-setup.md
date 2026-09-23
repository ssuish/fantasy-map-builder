# Local Codex setup

Project `.codex/` settings and installed `.agents/skills/` directories are intentionally Git-ignored. Root and app `AGENTS.md` files are tracked instructions; `skills-lock.json` files record the sources of locally installed skills. Restore the needed PixiJS, Strapi, and cloud skills before work that depends on them, or use current official documentation when a local skill is unavailable.

For this project, configure `.codex/config.toml` locally with the selected Sol model and two worker slots:

```toml
model = "gpt-6-sol"
model_reasoning_effort = "low"
model_context_window = 1000000
model_auto_compact_token_limit = 850000

[agents]
enabled = true
max_concurrent_threads_per_session = 2
default_subagent_model = "gpt-6-luna"
default_subagent_reasoning_effort = "medium"
```

The local `.codex/agents/luna_worker.toml` role uses `gpt-6-luna`, medium reasoning, `model_context_window = 1000000`, and `model_auto_compact_token_limit = 850000`. Keep the role's instruction to return status, evidence, validation, and blockers, and never spawn additional agents.

These values request a 1M-token window; availability and effective limits depend on the client, model, and account. Start a new Codex session after changing configuration and inspect its effective model/window. Keep task context focused even when the larger window is available; long-context requests may cost more. See the [Codex configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference), [GPT-6 Sol](https://developers.openai.com/api/docs/models/gpt-6-sol), and [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna).

Plans live locally under `docs/agents/plans/<slug>/PLAN.md`; verification receipts live under `docs/agents/build-logs/<slug>/STATUS.md`. Both directories are ignored by Git, so transfer a plan explicitly when another clone or worktree needs it. GitHub issues hold shared progress across environments.
