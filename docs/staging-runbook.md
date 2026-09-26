# Phase 0 staging runbook

## Current state

Local Docker Compose starts PostgreSQL, the S3-compatible object store, and Strapi; its smoke checks do not establish cloud behavior. The Atlas Neon project `spring-meadow-23046405` has a `staging` child branch of `production`, while this workspace still links `production`. The CMS is not connected to Neon. The user reports Google Cloud project `atlas-project` is integrated with Firebase; confirm its project ID and Hosting site before deployment. Cloud Run and Firebase Hosting deployments have not been verified.

Cloudflare R2 buckets `atlas-draft-private` and `atlas-published-public` exist. Both have `r2.dev` disabled, no custom domain, and no CORS policy. Keep the private bucket without public access. The published bucket needs the selected custom domain `atlas-assets-staging.kofeejan.com` before the anonymous map check can pass. Do not treat the bucket's name as proof that it is publicly readable.

## Remaining setup

1. Confirm `atlas-project` as the deployment target and identify the Firebase Hosting site. Prefer Cloud Run `asia-east1` for the initial Taiwan/APAC audience, then measure latency to Neon. Confirm billing, budgets, and alert recipients before deployment.
2. Connect Cloud Run only to Neon's `staging` branch using a dedicated database role and pooled connection string. Store the connection string in Google Secret Manager; never put it in Git, build arguments, container images, or printed logs. Check `neon status` before any Neon mutation because the local context points to `production`.
3. Connect `atlas-assets-staging.kofeejan.com` to `atlas-published-public` in the same Cloudflare account. Leave `r2.dev` disabled for both buckets. Configure exact browser origins and required methods/headers on each bucket: public GET through the custom domain, and browser presigned PUT/GET through the R2 S3 API hostname. Expose `ETag` only where the client needs it. Presigned URLs cannot use the custom domain. Use separate least-privilege application and administration credentials.
4. Build the CMS container from the repository root using `atlas-cms/Dockerfile`. Deploy to Cloud Run with `HOST=0.0.0.0`, the platform's `PORT`, `DATABASE_CLIENT=postgres`, and runtime-injected secrets. Deploy `atlas/dist` through Firebase Hosting using `firebase.json`.
5. Upload one immutable demo manifest and map asset to the public R2 release prefix. The SPA still hardcodes `/maps/eldoria/manifest.json` in `atlas/src/main.tsx`; make the staging build load the public manifest URL before deployment. Do not use private Draft assets as demo data.

Phase 3 will add a Firebase Hosting `/api/**` rewrite to Cloud Run for same-origin browser API calls. Google OAuth uses an explicit Strapi backend callback URL. Strapi refresh mode must use a secure, HttpOnly `__session` cookie because Firebase Hosting forwards only that cookie name to Cloud Run; browser sign-in and refresh require end-to-end checks.

Before any `gcloud` command, follow the local `gcloud` skill's four checks:

1. **Step 1: Syntax Validation:** run `gcloud help <leaf_command>`.
2. **Step 2: Parameter Verification:** confirm project, region, required flags, and whether dry-run or validate-only exists.
3. **Step 3: Dry-Run Command Proposal:** run a supported dry-run or validate-only command first.
4. **Step 4: Command Proposal & Authorization:** review the exact target; obtain authorization for denylisted operations before executing them.

## Required staging checks

- CI passes from a clean root `npm ci`, including frontend, CMS, contract, and container checks.
- Firebase serves the SPA; the browser loads the immutable map manifest and art through `atlas-assets-staging.kofeejan.com` with expected cache and CORS headers. Confirm `r2.dev` stays disabled.
- Cloud Run `GET /api/health` returns success. Verify the Neon `staging` connection separately; this health route reports HTTP availability, not ongoing database connectivity. Check structured logs without printing secrets.
- A known private R2 object is readable with authorized credentials and denied to an anonymous request. Verify browser presigned URL operations, CORS, content types, and ETags against R2; local Compose is insufficient.
- Budget alerts exist for Google Cloud, Neon, and R2; record owners and thresholds outside secret files. Record the deployed commit, URLs, and check results in GitHub issue #1.

## References

- [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract)
- [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config)
- [Firebase Hosting cookie forwarding](https://firebase.google.com/docs/hosting/manage-cache)
- [Strapi Users & Permissions sessions](https://docs.strapi.io/cms/features/users-permissions)
- [Cloudflare R2 location hints](https://developers.cloudflare.com/r2/reference/data-location/)
- [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
