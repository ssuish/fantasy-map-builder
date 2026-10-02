# Staging deployment

## Scope

Phase 0 staging is read-only: Firebase Hosting serves Atlas, public R2 serves an immutable manifest and map, Cloud Run serves Strapi health, and Neon staging holds the deployed CMS schema. Firestore and Functions are not configured as deployment targets; `firebase.json` deploys Hosting only.

Verified project: atlas-project-509605, Cloud Run region asia-southeast1. Pushes to stage invoke the checked-in Hosting workflow.

## Preflight

1. Inspect Git state, target commit, and existing receipts.
2. Run npm ci, relevant checks, and npm run test:browser -w atlas.
3. Confirm the immutable manifest URL.
4. Before Neon mutation, run neon status and select staging; local context previously pointed to production.
5. Keep secrets in Secret Manager/provider stores; never put values in logs or artifacts.

## Atlas Hosting

Build setting:

~~~text
VITE_PUBLIC_MAP_MANIFEST_URL=https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev/phase-0/eldoria/v1/eldoria-manifest.json
~~~

Normal path: merge to stage. Manual fallback after the same build:

~~~sh
npm ci
npm run build -w @atlas/contracts
VITE_PUBLIC_MAP_MANIFEST_URL=https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev/phase-0/eldoria/v1/eldoria-manifest.json npm run build -w atlas
npx -y firebase-tools@latest deploy --only hosting --project atlas-project-509605
~~~

Hosting publishes atlas/dist and rewrites SPA routes. Deploy success is separate from browser verification.

## R2 assets

Published bucket: `atlas-published-public`; immutable prefix: `phase-0/eldoria/v1/`. In the Cloudflare console, place `atlas/public/maps/eldoria/world-map.svg` at `phase-0/eldoria/v1/world-map.svg` with `image/svg+xml`, then place `docs/staging-assets/eldoria-manifest.json` at `phase-0/eldoria/v1/eldoria-manifest.json` with `application/json`. The manifest image URL must point to that SVG key. Use a new prefix for corrections; do not overwrite a published key.

The verified public GET origin is `https://atlas-project-509605.web.app`. Its R2 responses allow that origin and expose `ETag`. If using `https://atlas-project-509605.firebaseapp.com` or `http://localhost:8080`, add those exact origins to the bucket CORS rule and verify them before use. Keep methods to GET/HEAD and allowed headers to those actually sent, including `Accept`. Public reads use `r2.dev`; future presigned uploads use the R2 S3 API hostname.

Private bucket `atlas-draft-private` has public access disabled and no custom domains; anonymous GET of known object `test-favicon.ico` returned HTTP 401 through the disabled managed hostname. Presigned PUT/GET, CORS, ETags, and upload content types remain separate checks before Draft uploads.

## Cloud Run

Service: map-builder-cms-staging; last verified revision: map-builder-cms-staging-strapi556-20261002; image digest:

~~~text
docker.io/adreanq/map-builder-cms@sha256:451914dda9aa903d11c42e2a79161c64a0ce96a043b5bfddc3a511ff2bc92fbf
~~~

Build the image from repository root with `atlas-cms/Dockerfile`, publish it to the public `adreanq/map-builder-cms` Docker Hub repository, and pin the resulting digest before deployment. Preserve `HOST=0.0.0.0` and Cloud Run's injected `PORT`. Set `DATABASE_CLIENT=postgres`; inject these variables from Secret Manager at runtime through the dedicated service identity in [inventory.md](inventory.md):

| Runtime variable | Secret Manager resource |
|---|---|
| `DATABASE_URL` | `atlas-stage-database-url` |
| `APP_KEYS` | `atlas-stage-app-keys` |
| `ADMIN_JWT_SECRET` | `atlas-stage-admin-jwt-secret` |
| `API_TOKEN_SALT` | `atlas-stage-api-token-salt` |
| `TRANSFER_TOKEN_SALT` | `atlas-stage-transfer-token-salt` |
| `ENCRYPTION_KEY` | `atlas-stage-encryption-key` |
| `JWT_SECRET` | `atlas-stage-jwt-secret` |

Keep access on each secret scoped to the dedicated CMS service identity. Validate any proposed deployment with `gcloud help run deploy`, inspect current service configuration first, and deploy only to the explicit staging project and region. IAM changes require separate explicit authorization. Do not reconstruct secret values from this runbook.

~~~sh
gcloud run services describe map-builder-cms-staging --region=asia-southeast1 --project=atlas-project-509605 --format='value(status.url,status.latestReadyRevisionName)' --quiet
curl --fail --silent https://map-builder-cms-staging-zgyfospy5q-as.a.run.app/api/health
~~~

HTTP health does not prove Neon connectivity; public.strapi_migrations is separate evidence.

## Acceptance

- Hosting URL https://atlas-project-509605.web.app serves the SPA.
- Browser sees R2 200 responses, expected MIME, CORS, and no console/page errors.
- Cloud Run health returns 200.
- Neon evidence names staging and separately confirms migration.
- Private R2 anonymous access remains denied.
- Record commit, URLs, revision/digest, checks, and skipped gates in the issue or an evidence note without secrets or raw logs. `npm run verify` writes local command results only.

## Rollback and production follow-up

Restore an identified prior Hosting version through Firebase controls. Route Cloud Run traffic to a verified prior revision only after inspecting current traffic and validating gcloud help run services update-traffic. Keep immutable R2 prefixes. Production needs separate project/service/database/secrets, custom kofeejan.com domains, R2 custom domain/cache policy, budgets, backups, security headers, signed-operation tests, OAuth E2E, and reviewed rollback.

## Dependency maintenance verification — 2026-10-02

The Strapi 5.56.0 revision receives 100% of traffic after a no-traffic startup and explicit promotion. Runtime configuration, service identity, secret references, networking, and scaling matched the captured pre-deployment configuration. Public health/admin JavaScript returned 200; anonymous upload returned 403 and admin email returned 401. Explicit Neon staging inspection found zero application migration records and nine internal migration records, matching the isolated validation clone after candidate/previous-image startup. Health alone was not used as database evidence.

Hosting version `2fe3d7ecf6e1d308` was deployed using the immutable R2 manifest above. Chromium at 1440×1000 and 390×844 rendered nonblank map artwork with manifest/image HTTP 200, correct MIME/CORS, and no console/page errors. Browser plugin was unavailable; regular Playwright supplied the evidence. This demo has no interactive editing controls.

Rollback retains CMS revision `map-builder-cms-staging-00003-z86`, prior image digest `8b06a5132755f2b4520e6e06b3a89113ede5c8bc5c71fc72add97cbf0803d56e`, and Hosting version `8db9b1e6cd0365fe`. Validate installed leaf help and inspect current state before rollback. Database compatibility was exercised on an isolated clone; full pilot data restoration remains separate.
