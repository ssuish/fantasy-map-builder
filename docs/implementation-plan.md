# Fantasy Map Builder MVP Implementation Plan

## Delivery strategy

Build vertical slices that remain deployable. Prove map rendering, persistence, and publication risks before polishing the full editor. Every phase ends with observable behavior and automated checks.

## Proposed repository layout

```text
apps/
  web/                 React/Vite Creator and Explorer SPA
  cms/                 Strapi application and custom backend modules
packages/
  domain/              Shared domain values, commands, manifests, schemas
  map-engine/          Terrain Engine and Canvas Document
  contracts/           Versioned HTTP and release-manifest contracts
  test-support/        Deterministic fixtures and in-memory adapters
public/
  stamps/              Built-in licensed/original sprite sheets
docs/
  adr/
```

Use one TypeScript workspace so frontend, backend, workers, contracts, and tests share schema types without copying them. Keep runtime-specific code out of `domain` and `contracts`.

## Phase 0: Foundation and walking skeleton

### Deliverables

- TypeScript workspace, formatting, linting, Vitest, Playwright, and CI.
- React/Vite shell deployed to Firebase Hosting preview.
- Strapi container running locally and on Cloud Run staging.
- Neon pooled PostgreSQL connection.
- Private and public R2 buckets with least-privilege credentials and exact CORS rules.
- Health endpoints, structured logging, secrets documentation, and budget alerts.
- One static public map manifest rendered by PixiJS from R2.

### Exit checks

- CI builds and tests both applications.
- Staging deployment serves SPA, API health, and one immutable map asset.
- Private bucket is not publicly readable; public bucket works only through intended production/development paths.

## Phase 1: Terrain Engine and viewport

### Deliverables

- Deterministic generator with seed, land coverage/sea level, roughness, average temperature, and average moisture.
- 2048×1024 source fields split into 256×256 tiles.
- Derived biome colors, water depth, coastline, hill-shading, and contour overlay.
- PixiJS viewport with pan, zoom, and seamless horizontal wrapping.
- Elevation, temperature, and moisture brushes.
- Blank-map and generated-map creation in memory.

### Exit checks

- Golden seed tests are deterministic.
- Seam painting and rendering are continuous.
- Brush updates recompute only dirty tiles.
- Generation and normal brush interaction meet the initial performance budget on a baseline laptop.

## Phase 2: Canvas artwork and editor behavior

### Deliverables

- Fixed layers and visibility controls.
- Freehand pen/eraser and lossless art tiles.
- Built-in hand-drawn sprite sheet and Symbol Stamp transforms.
- Road and river Feature Strokes.
- Hotspot placement, radius, visibility, and selection.
- Session-only command-based undo/redo.
- Contour default toggle.

### Exit checks

- Object editing follows product rules.
- Seam-adjacent artwork renders continuously without duplicate saved objects.
- Undo/redo tests use the Canvas Document interface.
- Visual regression fixtures cover every layer and representative zoom levels.

## Phase 3: Identity, ownership, and Draft autosave

### Deliverables

- Strapi Users & Permissions Google provider.
- Creator profile creation and editing.
- Map list/create/rename/delete flows.
- Task-oriented private routes with centralized ownership policy.
- Private R2 upload plans and presigned URLs.
- Incremental Draft autosave and load.
- Optimistic revision conflicts with a safe stale-tab UI.
- Regeneration warning and exact cleanup behavior.

### Exit checks

- An authenticated Creator cannot access another Creator's Draft or signed URLs.
- Refresh restores the latest committed Draft.
- Injected upload failures never commit manifests referencing missing objects.
- Two-tab tests prove stale saves return conflict instead of overwriting.

## Phase 4: Lore and interactive map content

### Deliverables

- Point of Interest names, Feature Summaries, and same-map Lore relations.
- Lore Entry rich-text editor, cover/inline images, Lore Tags, and related Lore Entries.
- Browser-to-R2 image uploads with server verification.
- Creator-side Lore browsing and search.
- Explorer Hotspot panel and Lore navigation against a development snapshot.

### Exit checks

- Many-to-many and self-relations enforce same-map rules.
- Rich text is sanitized and image types/sizes are restricted.
- Hotspot selection works with visible and invisible markers.
- Keyboard and screen-reader behavior is verified for all DOM controls and Lore content.

## Phase 5: Atomic publication and Explorer experience

### Deliverables

- Start/finalize publication workflow.
- Browser-rendered base map, contour overlay, and thumbnail uploads.
- Server-built immutable public manifest.
- Transactional `publishedReleaseId` pointer switch and search projection replacement.
- Public and Unlisted routes.
- Responsive Explorer experience for desktop, tablet, and phone.
- Local within-map search and global Public Map discovery/search.
- Minimal Creator Profile pages.

### Exit checks

- Failure injection at every publish stage preserves the prior Published Version.
- Draft edits never leak into public payloads.
- Unlisted Maps resolve by URL but never appear in search/profile listings.
- Anonymous map loading requires no Strapi credential.
- Public assets use immutable URLs and expected cache headers.

## Phase 6: Moderation, deletion, and launch hardening

### Deliverables

- Report link to external Google Form.
- Administrator actions to unlist/unpublish maps and suspend Creators.
- Typed-name map deletion and Creator account deletion.
- Idempotent asynchronous cleanup jobs for database and R2 content.
- Rate limits, security headers, dependency scanning, backup/runbook documentation, and cost dashboards.
- Unsupported-browser and recoverable network-error experiences.

### Exit checks

- Moderated/suspended content disappears from all public resolution and search paths.
- Deletion makes content inaccessible before background cleanup begins.
- Cleanup retries safely and leaves an auditable operational result.
- End-to-end Creator and Explorer acceptance journeys pass in staging.
- Production launch checklist and rollback procedure are complete.

## Cross-cutting test matrix

| Risk | Required evidence |
|---|---|
| Horizontal wrapping | Terrain, artwork, strokes, stamps, Hotspots, pan, and search selection tested at seam |
| Data loss | Upload-before-manifest ordering, optimistic concurrency, retry, refresh recovery |
| Partial publication | Failure injection, immutable keys, transactional pointer switch |
| Draft leakage | Authorization and public-query leakage tests |
| Cross-map relations | Database constraints/service validation tests |
| Public moderation | Resolution, discovery, cache, and search removal tests |
| Cost growth | Object count/storage metrics, cleanup metrics, provider budget alerts |
| Browser performance | Deterministic performance scene, texture memory, brush latency, initial load |

## Deferred backlog

- Touch-first Creator editing.
- Custom stamp/brush uploads and asset packs.
- Arbitrary layers, groups, blending, and vector control-point editing.
- More palettes and terrain rendering styles.
- Collaboration and shared ownership.
- User-facing history, recovery, exports, and print rendering.
- Social features, Explorer accounts, comments, reactions, and follows.
- Automated moderation.
- Dynamic world simulation and hydrology.

