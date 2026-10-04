# Repository instructions

## Workspace and privacy

Use the root npm workspace and lockfile. Run workspace commands from the repository root; app-specific instructions are in `atlas/AGENTS.md` and `atlas-cms/AGENTS.md`. Keep shared contracts in focused packages.

`CREDENTIALS.md` and all `.env` variants except `.env.example` are private. Never read, search, quote, copy, stage, or transmit their contents. Inspect filenames/ignore status only when needed. Keep them out of Git and Docker contexts; `.env.example` contains placeholders only.

## Task routing

- **Scope:** Before feature planning, implementation, review, or acceptance, read [product specification](docs/product-spec.md) and the relevant live issue. For delivery dependencies read [implementation plan](docs/implementation-plan.md). Deferred work requires an explicit scope decision.
- **Design:** Before changing terminology, contracts, or responsibilities, read [domain authority](docs/agents/domain.md), relevant technical/data design, and ADRs.
- **Plan:** Before planning/replanning a slice, coordinating workers, or saving a plan, follow [workflow](docs/agents/workflow.md). Owner-confirmed decisions and authorization must be explicit.
- **Explore:** For code structure, declarations, or syntax patterns, follow [exploration](docs/agents/exploration.md): rg locates files/text; repository tree-sitter command inspects syntax.
- **Commit:** Commit each coherent reviewable action after affected checks; stage only owned paths. Follow [workflow](docs/agents/workflow.md) for micro commits and professional commit/PR text.
- **Verify:** Before committing/completing work or reusing evidence, follow [verification](docs/agents/verification.md). Full task verification and required browser/integration evidence remain separate from issue acceptance.
- **History:** At material scope/decision/architecture/implementation milestones or corrections, run the script described in [local history](docs/agents/build-log-template.md). History is append-only provenance, independent of the harness.
- **Issues:** Before reading/updating acceptance, labels, or shared status, follow [GitHub procedure](docs/agents/issue-tracker.md).
- **Operations:** For local services, deployment, provider configuration, or recovery, use the relevant [runbook](docs/runbooks/README.md) and product skill. Report observed evidence and limits.

## Framework and cloud skills

For PixiJS use `atlas/.agents/skills/pixijs/SKILL.md`. For Strapi use `atlas-cms/.agents/skills/strapi-docs-mcp/SKILL.md`. For Cloud Run/gcloud use matching root skills, including `gcloud` for every gcloud command. For Neon use `.agents/skills/neon/SKILL.md`, confirm `neon status` before mutation, and target staging explicitly: local context may point to production. Pull credentials into local env files only when explicitly requested.

Installed skills and `.codex/` are local-only; restore them or use official documentation and tracked setup guidance when absent. `skills-lock.json` records skill sources, not application dependencies. Prefer Context7 for current library/framework docs and resolve its library ID first.
