# Local agent setup

Read when restoring local skills, configuring agent roles, or preparing exploration tools in a new checkout.

Root/app AGENTS.md and repository procedures transfer through Git. Project `.codex/`, installed `.agents/skills/`, local plans, history, and verification receipts are ignored. `skills-lock.json` records local skill sources. Restore task-relevant PixiJS/Strapi/cloud skills or use current official docs when unavailable.

Keep primary planning/integration at selected defaults. Configure available bounded worker roles according to the local Codex environment; [workflow](workflow.md) owns delegation rules. Do not treat a suggested model or context setting as a verified runtime property. Inspect effective role support when selecting an override; use official OpenAI documentation for configuration syntax.

Run root dependency setup for the [tree-sitter exploration command](exploration.md). Parser packages are pinned development dependencies. Native loading may need a compiler toolchain when a prebuilt binary is unavailable; verify parser tests after setup and report installation failures. No machine-global tree-sitter CLI or hidden local grammar checkout is required.

[Verification](verification.md) owns current receipt locations/freshness. [History](build-log-template.md) owns independent local milestone appends. GitHub holds shared acceptance/status; canonical docs hold current requirements. Ignored files are not transferred across clones.

Local Neon context may point to production even though staging exists. Follow the Neon skill, inspect `neon status`, and select staging explicitly for staging mutations. Store runtime secrets through the existing runbook; local MCP keys/configuration are not documentation content.
