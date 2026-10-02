# Strapi dependency maintenance

Reviewed and deployed on 2026-10-02 for issue #19. This maintenance task does not complete a pilot phase or establish Creator readiness.

## Selected versions and compatibility

All four direct Strapi packages move from 5.54.0 to 5.56.0. Node 24 and CMS React 18 satisfy the new release's requirements. The application has no custom content models or authentication implementation to migrate. The obsolete `webhooks.populateRelations` setting is removed; it was already unsupported in Strapi 5.

Strapi 5.56.0 supplies sharp 0.35.4 and qs 6.16.0, so the sharp override is removed. Root overrides select Axios 1.20.0 and Nodemailer 10.0.13. Nodemailer 10 raises the Node minimum to 20 and changes its packaging; the Sendmail provider's public `init`/`send` API must remain compatible.

References: [Strapi 5.56.0](https://github.com/strapi/strapi/releases/tag/v5.56.0), [Nodemailer 10](https://github.com/nodemailer/nodemailer/releases/tag/v10.0.0), and [removed webhook setting](https://docs.strapi.io/cms/migration/v4-to-v5/breaking-changes/remove-webhook-populate-relations).

## Lockfile maintenance

Use the root workspace lockfile. A clean `npm ci` must be followed by inspection of versions actually resolved by the Strapi providers and consumers, not just the declared overrides.

During this upgrade, npm 11.16.0 retained unpatched upstream pins when regenerating an existing workspace lockfile, including after `npm update`. Resolution in a fresh temporary workspace containing only the four workspace manifests correctly applied the overrides. Its generated lockfile was copied back only after checking every Axios, Nodemailer, and sharp entry. The resulting clean installation selected the reviewed versions.

`npm ls axios nodemailer sharp --all --json` still reports `ELSPROBLEMS` for the Axios/Nodemailer overrides against Strapi's exact upstream pins. This is an override maintenance risk, not evidence of a successful runtime. Recheck resolved versions, clean installation, provider tests, and image startup whenever Strapi or the lockfile changes. Do not use `npm audit fix --force`: its proposed Strapi 4 downgrade is incompatible with this application.

## Advisory paths and remaining limitations

The final reviewed lockfile audit (`npm audit --omit=dev --json`) reports 21 package entries: 3 high, 17 moderate, and 1 low. Aggregate Strapi entries are not independent vulnerabilities. Axios, Nodemailer, and sharp are absent from this audit's vulnerable entries.

| Underlying package | Path and exposure assessment | Current handling |
|---|---|---|
| Vite 5.4.21 | Strapi build/development tooling; advisories include optimized-dependency traversal, Windows path handling, and its esbuild development server. | The Linux image builds admin assets and runs `strapi start`. Do not expose development servers to untrusted networks; use Linux/container development. Keep the supported Strapi dependency rather than forcing a Vite major override. |
| webpack-dev-middleware 6.1.3 | Strapi's optional webpack development tooling; GHSA-g84c-rxfj-3j2c concerns traversal under particular `publicPath` settings. | No development middleware is started by the production command. Keep it unexposed and track the upstream fix. |
| React Router 6.30.6 | Admin navigation dependencies; open-redirect and SSR-hydration advisories remain. | No custom navigation or SSR implementation exists in this application. The admin is a client-rendered bundle. Reachability is not fully validated; retain the supported major and restrict admin access to trusted operators. |
| markdown-it 14.3.0 | Content-manager WYSIWYG renderer enables `linkify: true`, matching the advisory's parsing mode. | The repository defines no WYSIWYG content types. Treat hostile rich text as an unresolved admin-side risk; do not claim the parser safe or add untrusted rich-text flows before resolution. |
| stream-json 1.9.1 | Data-transfer import/export uses JSONL Parser/Stringer. The reported vulnerable filters are not imported in the inspected source. | No application transfer flow exists. This is static exposure evidence, not an exercised import/restore guarantee; restrict transfer access and retain the finding. |
| DOMPurify 3.4.13 | WYSIWYG sanitizer uses an attribute-removal hook. The inspected caller does not use `IN_PLACE` or remove nodes, which are advisory preconditions. | No custom sanitizer hook exists. Keep the low advisory documented; this does not establish safety for future hook changes. |

Audit results can change without a lockfile change. Re-run the audit and review new advisory paths before subsequent deployment.

## Required validation and rollout

Run `npm ci`, `npm test --workspace=atlas-cms`, `npm run verify -- --task strapi-safe-upgrade`, Atlas browser smoke, and the production image against PostgreSQL. Tests use synthetic keys, a local SMTP sink, isolated upload storage, and an explicit nonexistent `ENV_PATH`; they must not load private environment files or contact real recipients.

Workspace hoisting can place `@strapi/core` at the repository root while keeping `@strapi/strapi` inside the CMS workspace. Strapi's internal plugin discovery then fails unless the CMS module directory is included in the CLI process's module search path. The CMS launcher must apply this path consistently to local commands and the production image; a test-only path override is insufficient.

Before shared staging startup, verify the exact CLI leaf syntax, explicit project/region, current traffic/image, a recoverable staging branch, and candidate/previous-image startup on isolated staging data. Preserve the existing service identity, secret references, and scaling. Deploy a digest-pinned candidate without traffic, check its public health and admin assets, then explicitly switch traffic. Record the Hosting version and verify browser loading, manifest/image MIME, and R2 CORS after redeployment.

Recovery preparation created `strapi-5-56-backup-20261001` (`br-autumn-waterfall-b3aff4yi`) from staging without a compute. Migration checks use its separate child `strapi-5-56-validation-20261001` (`br-raspy-pond-b38hqmmh`), expiring on 2026-10-08. The backup is retained for recovery; no data is copied into local environment files.

## Acceptance boundary

The default CMS upload provider remains local and Cloud Run storage is disposable. The default Sendmail provider uses direct MX SMTP; successful local sink tests do not prove deployed delivery. This task does not configure R2 uploads, transactional email, invitation controls, or pilot backup/restore acceptance. Preserve issue #19 as open until its required integration evidence and residual-risk acceptance are recorded. A health response and a passing local receipt do not close those gaps.

## Completion policy approved on 2026-10-02

Issue #19 can close after validation of the existing providers, a reviewed final image, isolated database compatibility checks, and a verified staging rollout. The user explicitly accepted two limitations: local Sendmail compatibility does not establish external delivery from Cloud Run, and local upload compatibility does not establish durable R2 uploads. Neither limitation permits storing real pilot data on disposable Cloud Run storage. Storage configuration, real delivery, invitation controls, and Draft/Published Version recovery remain separate pilot gates.

The fresh lockfile also selects pg 8.23.1 instead of 8.23.0 and vitest 5.0.3 instead of 5.0.2 within existing manifest ranges. These incidental patch updates are retained subject to the PostgreSQL integration and frontend/root checks; they do not change application contracts.

The default forgot-password controller writes its reset token before attempting SMTP delivery. A transport failure must still return an error, and an existing reset token after that failure is upstream behavior rather than proof that email was delivered.

Review execution uses exactly root and one Luna worker. Root performs independent Standards and Spec passes after the worker completes, corrects findings, and owns the final evidence and closure decision. A passing worker report is not acceptance by itself.

## Production corrections required by integration tests

The installed Users & Permissions configuration defaults to ten requests per minute, overriding its middleware fallback. The project now explicitly enables five requests per five minutes per route/identifier/IP. Tests use a fresh known user and require five SMTP deliveries followed by HTTP 429 with no sixth delivery; this is the project's policy, not a claim about upstream defaults.

Strapi's image classification returns false when decoding fails and previously treated a malformed declared image as an ordinary file. The upload plugin extension rejects a declared `image/*` when the image service cannot recognize it, before provider storage. Valid recognized images continue through upstream processing and variants. Image formats unsupported by that decoder are also rejected; allowed non-image content keeps its existing path. The extension applies to the shared upload service used by both content and admin uploads and replacement. It relies on an internal service and must be exercised on each Strapi upgrade.

The URL-attachment regression uses a reachable local HTTP sink and a positive Nodemailer fetch control. Forcing URL access on in memory now makes the blocking test fail, unlike the original closed-port test. Tests also use real local login/roles and the admin `/email/test` route, with production refresh sessions and HTTP-only cookies preserved.

## Observed rollout evidence — 2026-10-02

- Source: HEAD `d9c51634ad0a45b35b192be5c1c005c95887e7f9` plus uncommitted production source SHA-256 `73527d78e54f44f5867160313841dd863c8dddd25072d95a52af13ea9e1afa83`. No review branch push or shared stage merge was needed because Docker Desktop was restored. Production source identity covers root/workspace manifests, lockfile, CMS runtime/build source, and contracts; final receipt additionally covers tests and documentation.
- Image: `docker.io/adreanq/map-builder-cms@sha256:451914dda9aa903d11c42e2a79161c64a0ce96a043b5bfddc3a511ff2bc92fbf`. Cloud Run resolves its Linux manifest as `sha256:9aa6d2534898caa8b99118833f1a0ddb8495008d7fcb048545aa23d1707b19a7`.
- CMS: `map-builder-cms-staging-strapi556-20261002`, 100% traffic. Candidate tag and public URL passed health/admin/assets and denied anonymous upload/admin email. Captured configuration hash matched after deployment and promotion.
- Hosting: version `2fe3d7ecf6e1d308`; desktop/mobile deployed browser checks passed with rendered canvas, HTTP 200 manifest/SVG, expected MIME/CORS, and no runtime errors.
- Recovery: fresh staging backup `br-long-hill-b3ej0r7q`, validation `br-proud-mode-b31evd5z` expiring 2026-10-09T09:00:00Z. Both candidate and previous image booted against validation data after candidate startup. Staging and validation each expose zero application migration records and nine internal migration records. Earlier 2026-10-01 branches remain historical recovery preparation.
- Checks: clean root installation; 23 CMS tests; root lint/typecheck/tests/build; local browser smoke; final Docker build; actual image dependency resolution; local PostgreSQL; isolated Neon candidate/previous-image startup; no-traffic and promoted runtime checks; deployed browser. Final local receipt is `docs/agents/build-logs/strapi-safe-upgrade/STATUS.md`; use it only when HEAD/fingerprint still match. New CI was not required or run; local container evidence supplied the final image checks.
- Negative controls: in-memory disabling of URL or file protection caused its blocking test to fail as intended; reachable URL fetch and legitimate image/non-image controls passed.

No external email was sent, no real user upload was created in shared staging, no IAM or provider infrastructure was changed, and no private environment file was accessed. The accepted external-delivery/R2 limits apply only to this dependency gate.

The runtime and compatibility changes were subsequently captured in commit `0e572c2`. The deployment identifiers above describe the verified working tree used for the rollout; committing that source does not change its production source hash or the deployed image.
