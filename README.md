# Fantasy Map Builder

Fantasy Map Builder's private pilot lets invited Creators make one Map, save a private Draft, and explicitly publish or republish it to a stable URL. Anonymous Explorers view and navigate the Published Version. See the [current product specification](docs/product-spec.md) for retained capabilities and exclusions.

The implemented prototype is a static React/PixiJS map served through Firebase Hosting and public R2, with Strapi health on Cloud Run and Neon staging. Editor, ownership, persistence, and publication application flows remain planned. [Architecture](ARCHITECTURE.md) distinguishes current behavior from the target; [implementation plan](docs/implementation-plan.md) records delivery gates.

## Repository and setup

The root npm workspace contains `atlas/`, `atlas-cms/`, and `packages/contracts/`, using one root lockfile. Run commands from the repository root. Start with [local development](docs/runbooks/local-development.md) for Node/Docker setup and services; inspect package scripts for current commands.

## Documentation and tooling

- [Documentation index](docs/README.md): canonical product, technical/data design, architecture, domain language, decisions, and operations.
- [Agent workflow](docs/agents/workflow.md): planning interviews, bounded delegation, coherent micro commits, and completion.
- [Exploration](docs/agents/exploration.md): file/text discovery and Node tree-sitter structure.
- [Verification](docs/agents/verification.md): independent task receipts and evidence limits.
- [Local history](docs/agents/build-log-template.md): structured milestone appends, separate from verification.

Keep credentials in the existing private configuration/secret-store path, never in source, docs, or logs. The private pilot is not a public production launch.
