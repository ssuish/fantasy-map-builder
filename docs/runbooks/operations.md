# Staging operations

## Operating rules

- Inspect Git state, resource state, and receipts before mutations.
- Use explicit asia-southeast1 and atlas-project-509605 for Cloud Run.
- Run gcloud help <leaf-command> before any gcloud command; include project, location, reduced output, and --quiet.
- Run neon status before Neon work and select staging; context previously pointed to production.
- Keep secrets in Secret Manager/provider stores and never print values.
- Keep public R2 release prefixes immutable.
- Record commit, target, revision/digest, checks, and skipped gates without raw logs.

## Routine checks

Validate each gcloud leaf syntax first.

~~~sh
gcloud run services describe map-builder-cms-staging --region=asia-southeast1 --project=atlas-project-509605 --format='value(status.url,status.latestReadyRevisionName)' --quiet
gcloud run services logs read map-builder-cms-staging --region=asia-southeast1 --project=atlas-project-509605 --freshness=1h --limit=50 --format=json --quiet
curl --fail --silent https://map-builder-cms-staging-zgyfospy5q-as.a.run.app/api/health
curl --fail --silent --show-error --head --header 'Origin: https://atlas-project-509605.web.app' https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev/phase-0/eldoria/v1/eldoria-manifest.json
curl --fail --silent --show-error --head --header 'Origin: https://atlas-project-509605.web.app' https://pub-ba3ece4cf7ad4e828c1b86747124f613.r2.dev/phase-0/eldoria/v1/world-map.svg
~~~

For R2 responses, check `Access-Control-Allow-Origin` matches the supplied Hosting origin and inspect `Content-Type`; a successful HEAD without the CORS header is insufficient browser evidence. A private R2 anonymous 401 only proves public access is disabled, not presigned behavior.

## Failure triage

### Blank map

Check build manifest URL, fetch R2 objects and inspect status/MIME/CORS, run desktop/mobile browser smoke, keep last good prefix.

### Cloud Run health fails

Describe service, read bounded logs, verify 0.0.0.0 and injected PORT, check secret references and service identity, then use a verified prior revision after traffic inspection.

### Database evidence unclear

HTTP health does not test Neon. Run neon status, target staging, and verify migration or authorized connection evidence. Never use local production context for staging mutations.

### R2 operation fails

Public GET proves release reads only. Presigned PUT/GET, CORS, ETags, and content types need a controlled staging smoke before Draft uploads.

## Maintenance boundaries

Phase 0 has no scheduled cleanup, backup, budget alert, or production rollback automation here. Do not delete R2 objects, Neon branches, secrets, Cloud Run revisions, or Firebase releases as routine fixes. Record exact target and recovery path before explicitly authorized destructive maintenance.

Production follow-up: custom kofeejan.com domains, R2 custom-domain caching, isolated resources/secrets, budgets, backups, headers, signed-operation tests, OAuth E2E, and reviewed launch rollback.
