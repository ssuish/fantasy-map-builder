# Phase 0 progress

Last reviewed: 2026-09-28. Check completed items against the current Git state before reusing their evidence. The ignored `build-logs/build-log.md` records local phase evidence; task receipts are historical unless their Git HEAD and working-tree fingerprint match the current state. The `build-logs/phase-zero-r2-cloud-run/STATUS.md` receipt passed lint, typecheck, tests, and builds at its recorded commit.

## Local foundation

- [x] Root npm workspace, Node 24 pin, one root lockfile, and clean `npm ci`.
- [x] Shared static-map manifest contract and focused tests.
- [x] React 19 with `@pixi/react` v8 renders the 2048×1024 demo map; manifest tests and Chromium browser smoke passed.
- [x] Strapi `GET /api/health` route, route/controller tests, and TypeScript check passed.
- [x] CMS image built from root workspace; `docker compose config --quiet` passed.
- [x] Root, frontend, and CMS READMEs and `AGENTS.md` files now describe actual layout and commands; ADRs are no longer ignored.
- [x] Local Codex worker roles, ignored plan/build receipts, deployment runbook, and CI workflow created. Primary model and context settings now use Codex defaults; no effective 1M window was verified.
- [x] Root `npm run verify -- --task phase-zero-initialization` passed lint, typecheck, tests, and both builds on 2026-09-24. This historical result does not validate the current working tree.
- [x] Root `npm run verify -- --task align-mvp-plan-and-issues` passed lint, typecheck, tests, and both builds locally on 2026-09-27; it is not CI or staging evidence.
- [x] Local PostgreSQL, object store, and CMS started. `GET /api/health` returned HTTP 200 with `{ "status": "ok" }`, PostgreSQL held 43 Strapi tables, and a temporary object-store write/readback passed; the smoke object and bucket were removed.
- [x] [GitHub Actions CI run #36327837034](https://github.com/ssuish/fantasy-map-builder/actions/runs/36327837034) passed on pushed source commit `02e5d47`, covering verification, the production-bundle browser smoke, and PostgreSQL/CMS container health on port 8080. The docs/workflow follow-up commit has a separate CI run.
- [x] Local audit triage in [issue #19](https://github.com/ssuish/fantasy-map-builder/issues/19) found reachable `sharp` and `nodemailer` advisories. Root overrides pin patched versions; clean `npm ci`, CMS image health, and runtime package load passed. One high Vite advisory remains in a development/build path. CI passed on the deployed source commit; upload and email integration checks remain pending.
- [x] GitHub issues were checked against the product spec and current repository layout; issue #1 tracks remaining Phase 0 gates.

## Cloud staging

- [x] Firebase Hosting configuration, CMS Dockerfile, safe sample settings, and [staging deployment runbook](../runbooks/staging-deployment.md) prepared. Hosting initialization added staging workflows.
- [x] Atlas Neon project `spring-meadow-23046405` linked to `production`; empty `neon.ts` policy deployed with no remote changes and no local env pull.
- [x] Neon `staging` branch exists under `production`; the local Neon context still points to `production`.
- [x] Firebase CLI confirms staging project `atlas-project-509605` and default Hosting site; user confirms Blaze plan. Production gets a separate project.
- [x] R2 buckets `atlas-draft-private` and `atlas-published-public` exist. User reports `atlas-published-public` now has public URL `https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev`. Manifest and SVG reads, expected content types, and staging Hosting CORS have been verified. The private bucket remains non-public.
- [x] Built Atlas with the verified public R2 manifest URL and deployed `atlas/dist` through Firebase Hosting. Live browser loads the R2 manifest and SVG with staging CORS. Reserve the custom R2 domain and full budget/credential hardening for production.
- [x] Firebase Hosting deployed the R2-backed read-only demo to `https://atlas-project-509605.web.app` (Hosting version `8db9b1e6cd0365fe`). Remote manifest and SVG returned HTTP 200 with expected MIME and CORS headers; Chromium rendered a canvas at desktop and mobile widths without console or page errors. Generated workflows target the `stage` branch and build with Node 24.
- [x] Slim CMS Docker image built locally, loaded patched `sharp` and `nodemailer`, and returned HTTP 200 at `GET /api/health` against local PostgreSQL. Local Docker containers stopped; volumes preserved.
- [x] Cloudflare confirms the published bucket's `r2.dev` access is enabled and the private bucket's access is disabled. The connected API rejected a CORS write.
- [x] The prepared immutable demo asset and manifest were uploaded to `atlas-published-public` at `phase-0/eldoria/v1/world-map.svg` and `phase-0/eldoria/v1/eldoria-manifest.json`. Remote bytes match local source. Staging CORS browser reads passed.
- [x] Public Docker Hub image `adreanq/map-builder-cms:38c2f06` published and read back at digest `sha256:8b06a5132755f2b4520e6e06b3a89113ede5c8bc5c71fc72add97cbf0803d56e`.
- [x] Cloud Run revision `map-builder-cms-staging-00003-z86` serves `GET /api/health` at `https://map-builder-cms-staging-zgyfospy5q-as.a.run.app/api/health` with HTTP 200. It uses the pinned public Docker Hub image and a dedicated identity with narrow Secret Manager access. Strapi migrations created `public.strapi_migrations` on Neon branch `staging`, separately proving database connectivity. The role received `USAGE` and `CREATE` on that branch's `public` schema. Runtime secrets remain only in Secret Manager.

Phase 0 prototype checks pass in cloud staging. `atlas-draft-private/test-favicon.ico` exists; anonymous GET through its disabled managed `r2.dev` hostname returned HTTP 401. The bucket has no custom domains. Verify presigned PUT/GET, CORS, ETags, and content types before browser Draft uploads. Local S3-compatible storage cannot establish R2 behavior. Production hardening stays in Phase 6.
