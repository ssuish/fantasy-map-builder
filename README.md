# Fantasy Map Builder

Fantasy Map Builder is a planned web application for creating and publishing interactive 2D fantasy worlds. Creators can generate or paint terrain, add hand-drawn map features, connect locations to rich Lore, and publish the complete world at a shareable URL.

The repository contains a local Phase 0 walking skeleton: a React/PixiJS web app, a Strapi service, and a shared static-map contract. The full editor and cloud staging are still planned work.

## MVP capabilities

- Create a fixed 2048×1024 map with seamless horizontal wrapping.
- Start from blank terrain or a deterministic procedural generator.
- Paint elevation, temperature, and moisture as smooth raster fields.
- Derive land, water, coastlines, biomes, hill-shading, and optional contours.
- Draw freehand artwork, roads, and rivers.
- Place built-in fantasy Symbol Stamps for cities, trees, mountains, and landmarks.
- Add interactive Hotspots with summaries and linked Lore Entries.
- Author rich Lore with images, tags, and links between entries.
- Autosave a private Draft and publish the entire map as one coherent version.
- Share maps publicly or through an unlisted URL.
- Let anonymous Explorers pan, zoom, search, inspect Points of Interest, and read Lore.

## Technology

- React and TypeScript for the application interface.
- PixiJS for GPU-accelerated map rendering and interaction.
- Strapi for content management, custom backend workflows, and Google OAuth.
- Neon PostgreSQL for relational data and search projections.
- Cloudflare R2 for private Draft assets and immutable public releases.
- Firebase Hosting for the static web application.
- Google Cloud Run for the Strapi container.

## Core product boundaries

- Each map has one authenticated Creator; collaboration is outside the MVP.
- Explorers are anonymous and read-only.
- Terrain uses a static model rather than dynamic weather, erosion, hydrology, or seasons.
- Biomes and coastlines are derived; fantasy artwork remains unconstrained.
- Draft and Published Version are the only user-visible states. There is no version history.
- Creator editing targets desktop and laptop browsers. Touch-first editing is deferred.
- The MVP is web-only and does not provide image, print, or project-file export.

## Documentation

- [Documentation index](docs/README.md)
- [Product specification](docs/product-spec.md)
- [Technical design](docs/technical-design.md)
- [Data model](docs/data-model.md)
- [Implementation plan](docs/implementation-plan.md)
- [Domain glossary](CONTEXT.md)
- [Architecture decisions](docs/adr/)
- [Local Codex setup](docs/agents/codex-setup.md)

## Repository

```text
atlas/                 React, PixiJS, and Vite frontend
atlas-cms/             Strapi backend and container
packages/
  contracts/           Shared static-map manifest contract
docs/                  Product and engineering documentation
compose.yaml           Local CMS, PostgreSQL, and object store
firebase.json         Staging Hosting configuration
```

The root uses npm workspaces and one `package-lock.json`. Other shared packages from the technical design will be added when their features begin.

## Local setup

Use Node 24 and Docker. From the repository root:

```sh
npm ci
npm run dev:web
npm run dev:cms
npm run lint
npm run typecheck
npm test
npm run build
npm run verify -- --task local
```

`docker compose up --build` runs the CMS with local PostgreSQL and S3-compatible storage. Development-only credentials in Compose are not for staging. Keep real credentials in ignored local environment files, never in source or logs.

