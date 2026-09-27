# Phase 0 progress

Last reviewed: 2026-09-27. Check completed items against the current Git state before reusing their evidence. The 2026-09-24 `build-logs/phase-zero-initialization/STATUS.md` receipt is historical and does not match current inputs. Use the ignored `build-logs/align-mvp-plan-and-issues/STATUS.md` receipt only while its Git HEAD and working-tree fingerprint match.

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
- [x] [GitHub Actions CI run #36269556841](https://github.com/ssuish/fantasy-map-builder/actions/runs/36269556841) passed on pushed commit `e16fe66`, covering verification, the production-bundle browser smoke, and PostgreSQL/CMS container health on port 8080.
- [x] Local audit triage in [issue #19](https://github.com/ssuish/fantasy-map-builder/issues/19) found reachable `sharp` and `nodemailer` advisories. Root overrides pin patched versions; clean `npm ci`, CMS image health, and runtime package load passed. One high Vite advisory remains in a development/build path. CI evidence is still pending.
- [x] GitHub issues were checked against the product spec and current repository layout; issue #1 tracks remaining Phase 0 gates.

## Cloud staging

- [x] Firebase Hosting configuration, CMS Dockerfile, safe sample settings, and [staging runbook](../staging-runbook.md) prepared. Hosting initialization added staging workflows.
- [x] Atlas Neon project `spring-meadow-23046405` linked to `production`; empty `neon.ts` policy deployed with no remote changes and no local env pull.
- [x] Neon `staging` branch exists under `production`; the local Neon context still points to `production`.
- [x] Firebase CLI confirms staging project `atlas-project-509605` and default Hosting site; user confirms Blaze plan. Production gets a separate project.
- [x] R2 buckets `atlas-draft-private` and `atlas-published-public` exist. User reports `atlas-published-public` now has public URL `https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev`. Object access and CORS have not been verified. Keep private bucket non-public.
- [ ] Build Atlas with a public R2 manifest URL, deploy `atlas/dist` through Firebase Hosting, and configure exact R2 CORS if browser reads need it. Reserve custom R2 domain and full budget/credential hardening for production; triage high dependency findings before public CMS exposure.
- [x] Firebase Hosting deployed the bundled read-only demo from commit `38c2f06` to `https://atlas-project-509605.web.app`. Remote HTML, local fixture manifest, and SVG returned HTTP 200; Chromium rendered a canvas at desktop and mobile widths without console errors. Generated workflows target the `stage` branch and build with Node 24.
- [x] Slim CMS Docker image built locally, loaded patched `sharp` and `nodemailer`, and returned HTTP 200 at `GET /api/health` against local PostgreSQL. Local Docker containers stopped; volumes preserved.
- [x] Cloudflare confirms the published bucket's `r2.dev` access is enabled and the private bucket's access is disabled. The connected API rejected a CORS write.
- [ ] Upload the prepared immutable demo asset and manifest, set public-bucket CORS in Cloudflare console, and verify browser reads.
- [x] Public Docker Hub image `adreanq/map-builder-cms:38c2f06` published and read back at digest `sha256:8b06a5132755f2b4520e6e06b3a89113ede5c8bc5c71fc72add97cbf0803d56e`.
- [ ] Deploy CMS image to staging Cloud Run; verify `run.app` health and separate Neon `staging` connection. Google Secret Manager currently has no secrets; approval review rejected transferring the pooled Neon URL without explicit authorization.

Phase 0 prototype remains open until cloud staging checks pass. Local S3-compatible storage cannot establish R2 behavior. Resource creation alone does not prove deployment, database connectivity, or browser access. Production hardening stays in Phase 6.
