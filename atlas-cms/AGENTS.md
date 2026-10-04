# Atlas CMS

Follow root privacy/workspace instructions. Product behavior belongs to `docs/product-spec.md`; retained entities/invariants belong to `docs/data-model.md`.

- For Strapi changes read `.agents/skills/strapi-docs-mcp/SKILL.md` and current Strapi docs; use official docs when the local skill/server is unavailable.
- Use conventional `src/api/<name>/` routes/controllers/services/content types, narrow routes, and focused controllers. Mark intentionally public custom routes with `config.auth: false` and test externally visible behavior.
- Prefer TypeScript for new supported application code; preserve neighboring framework conventions. Add shared packages only with an approved design.
- Compose uses the repository root as build context. Preserve `0.0.0.0` binding and Cloud Run's injected `PORT`; Compose's `postgres` hostname works only inside its network.
- Inspect package scripts/config for commands and database modes. Run workspace operations from root. Local container/storage checks do not establish staging signing, ownership, or recovery acceptance; follow the relevant runbook for deployed checks.
