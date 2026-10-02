# Environment and resource inventory

Staging inventory verified on 2026-10-02. Phase 0 remains a read-only prototype. Secret values and connection strings are absent. Recheck live state before mutation.

## Staging

| Resource | Identifier or endpoint | Region or scope | Evidence |
|---|---|---|---|
| Google Cloud / Firebase project | atlas-project-509605 | Cloud Run asia-southeast1 | Firebase selected project; production separate. |
| Firebase Hosting | https://atlas-project-509605.web.app | Global | Hosting version 2fe3d7ecf6e1d308 served demo; desktop/mobile R2 smoke passed. |
| Hosting workflow | .github/workflows/firebase-hosting-merge.yml | GitHub stage | Uses Node 24 and repository service account secret. |
| Cloud Run service | map-builder-cms-staging | asia-southeast1 | Revision map-builder-cms-staging-strapi556-20261002 receives 100% traffic; health/admin and public denial checks passed. |
| Cloud Run URL | https://map-builder-cms-staging-zgyfospy5q-as.a.run.app | Public run.app | Public health access enabled. |
| Cloud Run image | docker.io/adreanq/map-builder-cms@sha256:451914dda9aa903d11c42e2a79161c64a0ce96a043b5bfddc3a511ff2bc92fbf | Docker Hub | Reviewed Strapi 5.56.0 image index; resolved Linux manifest 9aa6d2534898caa8b99118833f1a0ddb8495008d7fcb048545aa23d1707b19a7. |
| Service identity | map-builder-cms-staging@atlas-project-509605.iam.gserviceaccount.com | IAM | Narrow Secret Manager access. |
| Neon project | spring-meadow-23046405 | AWS ap-southeast-1 | Workspace linked to production; target staging. |
| Neon branch | staging (br-shy-base-b3p0oqzf) | Child of production | public.strapi_migrations exists. |
| Public R2 bucket | atlas-published-public | Cloudflare R2 | r2.dev release reads enabled. |
| Public release | phase-0/eldoria/v1/ | Immutable prefix | Manifest/SVG MIME and CORS verified. |
| Public R2 base | https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev | Managed URL | Rate-limited; production custom domain later. |
| Private R2 bucket | atlas-draft-private | Cloudflare R2 | r2.dev disabled; known-object anonymous GET 401. |

## Runtime secret names

Names only: atlas-stage-database-url, atlas-stage-app-keys, atlas-stage-admin-jwt-secret, atlas-stage-api-token-salt, atlas-stage-transfer-token-salt, atlas-stage-encryption-key, and atlas-stage-jwt-secret.

Values remain in Secret Manager. IAM changes are separate authorized work.

## Local

| Resource | Address | Persistence |
|---|---|---|
| Compose PostgreSQL | 127.0.0.1:5433 | atlas-postgres |
| Compose MinIO API | 127.0.0.1:9000 | atlas-object-store |
| MinIO console | http://127.0.0.1:9001 | Local only |
| Compose Strapi | http://127.0.0.1:1337 | Uses PostgreSQL volume |

Compose credentials are development-only.

## Out of scope

Firestore and Functions are not configured as deployment targets. Unused local initialization scaffolds were removed from the repository workspace; `firebase.json` deploys Hosting only.

## Dependency rollout recovery

The previous Cloud Run revision `map-builder-cms-staging-00003-z86` and Hosting version `8db9b1e6cd0365fe` are retained. Fresh staging backup `br-long-hill-b3ej0r7q` has no compute; validation child `br-proud-mode-b31evd5z` expires on 2026-10-09T09:00:00Z. Candidate and previous CMS image both booted against the candidate-started validation data. This is dependency compatibility evidence, not pilot Draft/Published Version recovery acceptance. See [strapi-safe-upgrade.md](strapi-safe-upgrade.md) for versions, checks, limitations, and source identity.
