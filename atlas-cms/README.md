# Atlas CMS

Atlas CMS is the Strapi 5 backend in the Fantasy Map Builder npm workspace. It provides the server foundation for map content and publishing workflows.

## Current status

The current Phase 0 service is a walking skeleton:

- Root `compose.yaml` runs Strapi with local PostgreSQL; the Phase 0 health smoke has been verified.
- `GET /api/health` is public and returns `{ "status": "ok" }`.
- The health route confirms the HTTP service is responding. It does not check database connectivity.
- Product content types, map authoring APIs, authentication workflows, and object storage integration are future work.
- Compose starts MinIO as a local object-store service, but Strapi is not yet configured to use it. Cloud Run deployment is planned, not completed.

## Run locally

Use Node 24 and Docker. From the repository root:

```sh
npm ci
docker compose up --build cms
```

Compose starts PostgreSQL as a dependency of the CMS. The Strapi admin is at [http://localhost:1337/admin](http://localhost:1337/admin), and the health endpoint is [http://localhost:1337/api/health](http://localhost:1337/api/health).

The local PostgreSQL container is also exposed on `127.0.0.1:5433`. The `postgres` hostname is for containers on the Compose network; a Strapi process started directly on the host must set `DATABASE_HOST=127.0.0.1` and `DATABASE_PORT=5433` in the local `.env`. To start Strapi directly from the repository root, use `npm run dev:cms` and provide local-only values in an ignored `atlas-cms/.env`. The checked-in `atlas-cms/.env.example` contains values aligned with root Compose for local development only; they are not production credentials.

Stop the services with:

```sh
docker compose down
```

This keeps the named PostgreSQL and object-store volumes. Do not reuse Compose credentials outside local development.

## CMS checks

Run these commands from the repository root:

```sh
npm test --workspace=atlas-cms
npx tsc -p atlas-cms/tsconfig.json --noEmit --pretty false
npm run build --workspace=atlas-cms
```

The focused test covers the health response and its unauthenticated route configuration. The repository-wide `npm test` and `npm run build` run checks across workspaces.

## Configuration and secrets

The server binds to `0.0.0.0` and reads its port from `PORT`, as required by the container runtime. Compose supplies fake local Strapi keys and PostgreSQL settings directly to the container. `atlas-cms/.env.example` documents development-only local settings; keep real credentials in private local environment files or the deployment secret store.

Never read, quote, commit, or transmit `CREDENTIALS.md` or real `.env` files. Do not place real credentials in this README, Compose configuration, or `.env.example`.

## Container

The CMS Dockerfile expects the repository root as its build context because it installs and builds npm workspaces:

```sh
docker compose build cms
```

The image runs Strapi in production mode and honors the runtime `PORT`. An image build is local verification only; it does not deploy the service.
