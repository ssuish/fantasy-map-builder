# Atlas CMS agent instructions

Follow the repository-root `AGENTS.md` for shared workflow, privacy, and coding rules. These notes add CMS-specific guidance.

## Workspace and commands

- This Strapi 5 app is an npm workspace named `atlas-cms`. Run install and workspace commands from the repository root; keep the root lockfile in sync when changing dependencies.
- Use the existing root npm workspace. Do not add another workspace or shared package without an approved design.
- Main CMS checks from the root:
  - `npm test --workspace=atlas-cms`
  - `npx tsc -p atlas-cms/tsconfig.json --noEmit --pretty false`
  - `npm run build --workspace=atlas-cms`
- Root `npm run build` also builds the shared contracts and frontend. Run only checks relevant to your change and report any skipped checks.

## Strapi changes

- Use Strapi's conventional folders under `atlas-cms/src/api/<api-name>/` for routes, controllers, services, and content types. Keep routes narrow and controllers focused.
- Mark intentionally public custom routes with `config.auth: false`; add a focused test for externally visible behavior.
- Prefer TypeScript for new app code where Strapi supports it. Keep generated or framework-conventional JavaScript consistent with its neighboring files.
- Consult `atlas-cms/.agents/skills/strapi-docs-mcp/SKILL.md` for Strapi questions. Use the official Strapi docs if the MCP server is unavailable.
- Database configuration supports SQLite, PostgreSQL, and MySQL. Compose connects Strapi to PostgreSQL at host `postgres`; that hostname is available inside the Compose network.

## Local runtime and secrets

- Compose uses the repository root as the Docker build context. Build or run the CMS from the root with `docker compose up --build cms`.
- The CMS listens on `HOST` and `PORT`; preserve `0.0.0.0` binding and Cloud Run's injected `PORT` behavior.
- Treat `CREDENTIALS.md` and every `.env` file other than `.env.example` as private. Never read, search, quote, copy, stage, or transmit their contents.
- Keep only non-production local development values in `.env.example`, aligned with Compose where appropriate. Compose credentials are for local development only; production secrets belong in the deployment secret store.
- Do not claim that a container build or deployment succeeded unless it was actually run and verified.
