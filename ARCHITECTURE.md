# Private pilot architecture

This document owns system topology and current-versus-planned responsibility boundaries. [Product specification](docs/product-spec.md) defines behavior; [technical design](docs/technical-design.md) defines module interfaces/terrain measurement; [data model](docs/data-model.md) defines retained invariants; [implementation plan](docs/implementation-plan.md) sequences delivery. ADRs preserve durable trade-offs. Earlier broad MVP topology is archived, not active scope.

## Implemented prototype

The repository contains a React/PixiJS Vite app, a Strapi CMS, and a focused static-manifest contract package in one npm workspace. The frontend renders the fixed static demo image from a validated manifest. The CMS has an unauthenticated health route and dependency-maintenance integration tests. Terrain editing, application ownership, Draft, and publication flows are not implemented by this harness task.

Staging uses Firebase Hosting for the SPA, public R2 for demo manifest/art, Cloud Run for Strapi, and Neon staging PostgreSQL. Private R2 is reserved for retained Draft objects. Local Compose provides CMS, PostgreSQL, and an S3-compatible store; local storage cannot establish production R2 semantics. Deployment identities, resource addresses, and dated observed checks belong in [runbooks](docs/runbooks/README.md), not repeated here.

Phase 0 and #19 evidence proves a limited static/dependency path. It does not prove invited Creator access, browser presigned uploads, Draft restore, publication, hardware performance, or pilot backup recovery. Live issue acceptance and current evidence must establish those separately.

## Planned pilot boundaries

| Component | Planned responsibility |
|---|---|
| Creator browser | React DOM controls and coarse state; PixiJS viewport; deterministic Terrain Engine/Worker; canonical Canvas Document and session history. |
| Firebase Hosting | Serve static SPA; planned same-origin API routing when identity/persistence work establishes it. |
| Cloud Run/Strapi | Google Creator authentication, invitation/ownership, private save and publication validation, narrowly scoped object access. Admin identity remains separate. |
| Neon staging | Identity/ownership metadata, revisions, Draft and current publication references. Large editor objects stay in R2. |
| Private R2 | Immutable private Draft objects and manifests; upload before reference commit. |
| Public R2 | Immutable complete release objects referenced only after verified publication. |
| Explorer browser | Resolve stable public URL and navigate one coherent Published Version anonymously. |

Keep high-frequency editing out of React state and behind focused module boundaries. Store authored objects once; horizontal seam copies remain rendering artifacts. Public clients cannot access private Draft content. Google sign-in remains Strapi-managed; Firebase Authentication is not the identity authority.

Existing provider choices and transactional release semantics are retained from ADRs 0001–0004. Hosting/cookie/OAuth/signing details must be validated during retained integration work rather than inferred from the static prototype. No Lore/search/profile/moderation subsystem is required.

## Data and failure boundaries

Creation/Session Replacement is disposable in-memory work until later saving. Failed creation preserves current session. Source fields derive display state; context recovery rebuilds rendering from those fields within tested limits.

Private saves commit references only after uploads and expected-revision checks. Publication verifies a new immutable release before switching the public pointer; failure keeps prior content available. Backup recovery must restore both metadata and reachable R2 objects before real Creator data is accepted. Details and open schema choices belong in technical design/data model and their issue gates.

## Evidence and evolution

The implementation plan is the dependency map. #19 and #27 are closed prerequisites; #2 is the next feature target after separate authorization. Final benchmark environment is deferred to owner-led final QA preparation; it remains a pilot release gate under #24. Software-rendered browser smoke and local root verification establish narrower evidence only.

Update architecture when responsibilities or integration boundaries change. Record hard-to-reverse trade-offs in ADRs and local milestones through the logger. History is provenance; current docs and live issue evidence establish current state.
