# Phase 0 staging runbook

This repository is deployment-ready only after the local checks pass. No Firebase, Cloud Run, Neon, or Cloudflare R2 staging resources have been created for this project yet. Do not use the machine's currently selected Google Cloud project without confirming it belongs to Fantasy Map Builder.

## Resources to create

1. Create one new Google Cloud project for staging and add Firebase Hosting to that same project. Prefer Cloud Run `asia-east1` for a Taiwan/APAC audience, then measure latency to the selected Neon region. Enable billing only after confirming the budget and alert recipients.
2. Create a Neon PostgreSQL project in the closest suitable APAC region. Give Strapi a dedicated database user and use Neon's pooled connection string for Cloud Run. Store the connection string in Google Secret Manager; never put it in Git, build arguments, or container images.
3. Create separate private Draft and public release R2 buckets, requesting the APAC location hint. Give the private bucket no public access. Serve public releases through a custom domain; keep the `r2.dev` development URL disabled. Configure exact browser origins and required methods in CORS, with separate least-privilege API tokens for application and administration.
4. Build the CMS container from the repository root using `atlas-cms/Dockerfile`. Deploy it to Cloud Run with `HOST=0.0.0.0`, the platform's `PORT`, `DATABASE_CLIENT=postgres`, and secrets injected at runtime. Deploy `atlas/dist` through Firebase Hosting using `firebase.json`.
5. Upload one immutable demo manifest and map asset to the public R2 bucket. Configure the web build's public manifest URL for that asset. Do not use private Draft assets as public demo data.

Before any `gcloud` command, follow the local `gcloud` skill's four checks:

1. **Step 1: Syntax Validation:** run `gcloud help <leaf_command>`.
2. **Step 2: Parameter Verification:** confirm project, region, required flags, and whether dry-run or validate-only exists.
3. **Step 3: Dry-Run Command Proposal:** run a supported dry-run or validate-only command first.
4. **Step 4: Command Proposal & Authorization:** review the exact target; obtain authorization for denylisted operations before executing them.

## Required staging checks

- CI passes from a clean root `npm ci`, including frontend, CMS, contract, and container checks.
- Firebase serves the SPA; the browser loads the immutable map manifest and art through the public R2 path with expected cache and CORS headers.
- Cloud Run `GET /api/health` returns success. Verify the Neon connection separately; this health route reports HTTP availability, not ongoing database connectivity. Check structured logs without printing secrets.
- A known object in the private R2 bucket is readable with authorized credentials and denied to an anonymous request. Public release objects are readable anonymously through the intended domain only.
- Budget alerts exist for Google Cloud, Neon, and R2; record owners and thresholds outside secret files. Record the deployed commit, URLs, and check results in GitHub issue #1.

The local Compose object store is S3-compatible test infrastructure, not proof of R2 behavior. Verify presigned URLs, CORS, content types, and ETags against actual R2 before accepting staging.

## References

- [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract)
- [Cloudflare R2 location hints](https://developers.cloudflare.com/r2/reference/data-location/)
- [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Cloudflare R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
