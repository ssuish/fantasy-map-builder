# Local development

## Prerequisites

Use Node.js 24, npm, and Docker Compose. Install Chromium with npx playwright install chromium. Run npm ci from the repository root.

## Start services

Compose provides PostgreSQL, MinIO, and Strapi. Values are development-only.

~~~sh
docker compose up --build
~~~

To start only CMS and PostgreSQL:

~~~sh
docker compose up --build cms
~~~

| Service | Address | Notes |
|---|---|---|
| Strapi admin | http://localhost:1337/admin | Port can change with CMS_PORT. |
| Strapi health | http://localhost:1337/api/health | Returns { status: ok }; does not prove database connectivity. |
| PostgreSQL | 127.0.0.1:5433 | postgres:5432 only works inside Compose. |
| MinIO API | 127.0.0.1:9000 | Local S3-compatible store. |
| MinIO console | http://localhost:9001 | Local only. |

The host CMS (npm run dev:cms) needs an ignored atlas-cms/.env based on atlas-cms/.env.example. Use DATABASE_HOST=127.0.0.1 and DATABASE_PORT=5433 on the host; Compose uses postgres:5432.

Run the frontend with npm run dev:web. Without VITE_PUBLIC_MAP_MANIFEST_URL, Atlas uses the bundled fixture. A staging manifest URL is public build-time configuration.

## Verify

~~~sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser -w atlas
curl --fail --silent http://127.0.0.1:1337/api/health
~~~

For a receipt, run npm run verify -- --task local; it is valid only for its recorded Git state.

## Stop and reset

~~~sh
docker compose down
~~~

This keeps named volumes. Use docker compose down -v only when intentionally discarding local data or reproducing CI clean-room setup. Local data is not staging evidence.

## Common failures

- Port collision: set CMS_PORT.
- CMS cannot resolve postgres: host process needs 127.0.0.1:5433.
- Missing Chromium: run npx playwright install chromium.
- Fixture loads unexpectedly: inspect build-time VITE_PUBLIC_MAP_MANIFEST_URL.
