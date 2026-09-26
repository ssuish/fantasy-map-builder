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
- [ ] Triage the four high production-scope dependency audit entries in [issue #19](https://github.com/ssuish/fantasy-map-builder/issues/19) before staging; audit output alone does not establish runtime exposure.
- [x] GitHub issues were checked against the product spec and current repository layout; issue #1 tracks remaining Phase 0 gates.

## Cloud staging

- [x] Firebase Hosting configuration, CMS Dockerfile, safe sample settings, and [staging runbook](../staging-runbook.md) prepared.
- [x] Atlas Neon project `spring-meadow-23046405` linked to `production`; empty `neon.ts` policy deployed with no remote changes and no local env pull.
- [x] Neon `staging` branch exists under `production`; the local Neon context still points to `production`.
- [x] User reports Google Cloud project `atlas-project` integrated with Firebase; confirm the exact project ID and Hosting site before deployment.
- [x] R2 buckets `atlas-draft-private` and `atlas-published-public` exist. Both have `r2.dev` disabled, no custom domain, and no CORS policy.
- [ ] Connect `atlas-assets-staging.kofeejan.com` to the published bucket, configure exact R2 CORS and least-privilege credentials, and establish Google Cloud, Neon, and R2 budget alerts.
- [ ] Deploy SPA and CMS; verify healthy API backed by Neon, one immutable public map through R2, exact CORS, and anonymous denial for a known private object.

Phase 0 remains open until cloud staging checks pass. Local S3-compatible storage cannot establish R2 behavior. Resource creation alone does not prove deployment, database connectivity, browser access, or budget alerts.
