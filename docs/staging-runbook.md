# Phase 0 staging runbook

## Goal and current state

Ship a quick read-only prototype: Firebase Hosting serves the Atlas SPA, Cloud Run serves Strapi health, and a public immutable map loads from R2. Authentication, Draft storage, publication, and production hardening remain later work.

Firebase project `atlas-project-509605` is the staging project. Firebase CLI lists its default Hosting site at `https://atlas-project-509605.web.app`; the user confirms Blaze billing. Firebase initialization also generated Firestore and Functions files, but Phase 0 deploys only Hosting. Production will use a separate Firebase project. Firebase Hosting now serves the R2-backed read-only demo at `https://atlas-project-509605.web.app`. The deployed build uses the immutable `phase-0/eldoria/v1/eldoria-manifest.json` URL; live desktop and mobile Chromium checks found a rendered canvas, successful R2 manifest/art requests, and no console or page errors. Cloud Run revision `map-builder-cms-staging-00003-z86` serves `GET /api/health` at `https://map-builder-cms-staging-zgyfospy5q-as.a.run.app/api/health` with HTTP 200.

The Neon project `spring-meadow-23046405` is in AWS `ap-southeast-1`. CMS connects to branch `staging` (`br-shy-base-b3p0oqzf`) as `db_stage_rwx`; `public.strapi_migrations` exists after deployment. The role has `USAGE` and `CREATE` on schema `public`, granted only on the staging branch. Local Neon context previously pointed to `production`, so always target `staging` explicitly for future mutations. Firebase and Cloud Run use Google Cloud `asia-southeast1` (Singapore).

R2 buckets `atlas-draft-private` and `atlas-published-public` exist. The published bucket serves the verified manifest at `https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev/phase-0/eldoria/v1/eldoria-manifest.json` and artwork at `phase-0/eldoria/v1/world-map.svg`. Both return the expected content types and staging Hosting CORS headers. The private bucket has public `r2.dev` access disabled and no custom domains; anonymous GET of known object `test-favicon.ico` returned HTTP 401 from the disabled managed hostname. `r2.dev` is rate-limited and lacks custom-domain caching and controls; reserve `kofeejan.com` subdomains for production.

## Prototype setup, in order

1. Build the root contracts workspace and `atlas/` Vite SPA. Set `VITE_PUBLIC_MAP_MANIFEST_URL` to an immutable public R2 manifest URL for the staging build. Without it, the app uses the bundled local map fixture. Firebase Hosting uploads `atlas/dist` and serves unknown SPA routes from `/index.html`.
2. The Cloudflare console now has `atlas/public/maps/eldoria/world-map.svg` at `phase-0/eldoria/v1/world-map.svg` and `docs/staging-assets/eldoria-manifest.json` at `phase-0/eldoria/v1/eldoria-manifest.json` in `atlas-published-public`. Preserve MIME types `image/svg+xml` and `application/json`. The public bucket CORS rule permits the staging Hosting origin and exposes `ETag`; verify other intended origins before using them. Do not enable public access on `atlas-draft-private`. Public GET uses `r2.dev`; future browser uploads use R2 S3 API presigned URLs.
3. Deploy only Firebase Hosting to project `atlas-project-509605`, or merge to the `stage` branch after its GitHub workflow passes. The generated workflow uses `FIREBASE_SERVICE_ACCOUNT_ATLAS_PROJECT_509605`; the secret name exists in GitHub. Do not deploy Firestore or Functions as part of Phase 0.
4. Triage high dependency findings in issue #19 before exposing CMS publicly. Build the CMS image with repository root as context and `atlas-cms/Dockerfile` as Dockerfile. Use the public Docker Hub repository `adreanq/map-builder-cms` for the prototype image, then deploy that image to a staging service in `asia-southeast1`. The verified slim image is 1.84 GB unpacked and about 401 MB as a Docker archive; the unpacked size is not Artifact Registry billed storage. Docker Hub public images are supported by Cloud Run, but production should reassess registry availability and costs. Preserve `HOST=0.0.0.0` and Cloud Run's injected `PORT`; inject Strapi secrets at runtime, never during image build. Use its default `run.app` URL.
5. Connect only the staging Cloud Run service to Neon's `staging` branch with a dedicated role and pooled connection string stored in Secret Manager. Check `neon status` and explicitly target `staging` before any Neon mutation. Verify database connectivity separately from `GET /api/health`.
6. Record deployed commit, Hosting URL, Cloud Run URL, R2 manifest URL, and checks in issue #1. Keep credentials and raw logs out of the issue.

## Runtime secrets and access

Cloud Run uses the dedicated identity `map-builder-cms-staging@atlas-project-509605.iam.gserviceaccount.com`. Secret Manager holds `atlas-stage-database-url`, `atlas-stage-app-keys`, `atlas-stage-admin-jwt-secret`, `atlas-stage-api-token-salt`, `atlas-stage-transfer-token-salt`, `atlas-stage-encryption-key`, and `atlas-stage-jwt-secret`. The identity has `roles/secretmanager.secretAccessor` only on these secrets. The service has public `roles/run.invoker` for `allUsers`; keep admin and write operations protected by Strapi authorization. Do not print secret payloads or store them in the repository. The deployed image is pinned to Docker Hub digest `sha256:8b06a5132755f2b4520e6e06b3a89113ede5c8bc5c71fc72add97cbf0803d56e`.

## Prototype checks

- CI passes on the deployed commit. Browser loads the Firebase Hosting SPA and immutable map manifest/art through `r2.dev`; verify status, content type, and CORS response headers if needed.
- Cloud Run `GET /api/health` succeeds at `run.app`. Separately verify Strapi starts against Neon `staging`; health only proves HTTP availability.
- Anonymous GET to private `test-favicon.ico` returned HTTP 401 through the disabled managed `r2.dev` hostname. Verify presigned PUT/GET, CORS, ETags, and content types before browser uploads. Local MinIO behavior is not R2 evidence.

## Later production setup

Use a separate production Firebase project, Cloud Run service, Neon target, and isolated secrets. Map chosen web, API, and public-assets subdomains under `kofeejan.com`. Attach the production asset hostname as an R2 custom domain, verify caching and public reads, then disable public `r2.dev` access when staging no longer needs it. If both environments share the published bucket, keep distinct immutable prefixes.

Phase 3 adds a Firebase Hosting `/api/**` rewrite to Cloud Run and tests Google OAuth callback and refresh through the deployed origins. Hosting forwards only the `__session` cookie name to Cloud Run; verify secure HttpOnly cookie behavior in a browser. Phase 6 covers budgets, signed-upload checks, headers, backups, monitoring, and rollback.

Before running `gcloud`, follow the local `gcloud` skill's syntax, target, dry-run, and authorization checks.

## References

- [Firebase Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart)
- [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config)
- [Cloud Run deploy from an image](https://cloud.google.com/run/docs/deploying)
- [Artifact Registry pricing](https://cloud.google.com/artifact-registry/pricing)
- [Docker Hub usage limits](https://docs.docker.com/docker-hub/usage/)
- [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract)
- [R2 public buckets and development URLs](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
