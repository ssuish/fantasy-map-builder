# Phase 0 progress

Last reviewed: 2026-09-24. Check completed items against the current Git state before reusing their evidence. The ignored `build-logs/phase-zero-initialization/STATUS.md` receipt records the latest root verification; rerun it after any tracked input changes.

## Local foundation

- [x] Root npm workspace, Node 24 pin, one root lockfile, and clean `npm ci`.
- [x] Shared static-map manifest contract and focused tests.
- [x] React 19 with `@pixi/react` v8 renders the 2048×1024 demo map; manifest tests and Chromium browser smoke passed.
- [x] Strapi `GET /api/health` route, route/controller tests, and TypeScript check passed.
- [x] CMS image built from root workspace; `docker compose config --quiet` passed.
- [x] Root, frontend, and CMS READMEs and `AGENTS.md` files now describe actual layout and commands; ADRs are no longer ignored.
- [x] Local Codex 1M-context settings, ignored plan/build receipts, deployment runbook, and CI workflow created.
- [ ] Confirm the effective 1M window in a Codex client that exposes it. An ephemeral strict-config session accepted the settings and used GPT-6 Sol, but did not report its effective window.
- [x] Root `npm run verify -- --task phase-zero-initialization` passed lint, typecheck, tests, and both builds on 2026-09-24; its receipt must match the final working tree.
- [x] Local PostgreSQL, object store, and CMS started. `GET /api/health` returned HTTP 200 with `{ "status": "ok" }`, PostgreSQL held 43 Strapi tables, and a temporary object-store write/readback passed; the smoke object and bucket were removed.
- [ ] Confirm GitHub Actions CI passes on a pushed commit. A local pass is not a CI pass.
- [ ] Triage the four high production-scope dependency audit entries in [issue #19](https://github.com/ssuish/fantasy-map-builder/issues/19) before staging; audit output alone does not establish runtime exposure.
- [x] GitHub issue #1 now records verified local work and remaining staging checks; issues #2–#18 had no stale repository paths.

## Cloud staging

- [x] Firebase Hosting configuration, CMS Dockerfile, safe sample settings, and [staging runbook](../staging-runbook.md) prepared.
- [ ] Create new Firebase/Google Cloud, Neon, and private/public R2 staging resources with budget alerts and least-privilege access.
- [ ] Deploy SPA and CMS; verify healthy API backed by Neon, one immutable public map through R2, exact CORS, and anonymous denial for a known private object.

Phase 0 remains open until CI and every local and cloud staging check pass. Local S3-compatible storage cannot establish R2 behavior. Cloud account access has not been provided.
