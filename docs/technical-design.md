# Private pilot technical design

This document owns technical responsibilities and confirmed Phase 1 representation/measurement rules. Product behavior belongs to [the product specification](product-spec.md), system topology to [ARCHITECTURE.md](../ARCHITECTURE.md), and retained entities/invariants to [the data model](data-model.md). [Issue #27's decision record](agents/phase-1-decisions.md) preserves provenance; live #2/#3 provide implementation acceptance. This target design is not evidence that features exist.

## Current and planned interfaces

The implemented shared contract is `StaticMapManifest`, parsed through `@atlas/contracts`; it describes the fixed demo image, not editable state or a future release schema. The frontend currently renders that image; the CMS has health and dependency-maintenance integration coverage. Terrain, Canvas Document, ownership, Draft, and publication application interfaces remain to be implemented.

Keep React responsible for accessible controls, dialogs, routing, and coarse editor state. PixiJS owns high-frequency viewport presentation. A Terrain Engine owns source buffers and derivation behind commands; keep individual pointer samples out of React state. Prefer pure kernels and a Web Worker for generation/derivation, exposing dirty results rather than duplicating authoritative buffers in callers. This is a module seam, not a requirement to build a general framework.

| Planned module | Responsibility and boundary |
|---|---|
| Terrain Engine | Create blank/generated fields; apply target-value Brushes; derive dirty tiles and needed neighbors; use common wrapped/bounded coordinates. |
| Viewport | Present derived textures/overlays, pan/zoom, map input coordinates, and display zoom-aware cursor previews. Keep rendering duplicates out of stored state. |
| Canvas Document | Own retained terrain, freehand/strokes, fixed layer order, and later session undo/redo. Define a canonical persistence boundary before saving. |
| Identity/Ownership | Resolve invited Strapi users and enforce one owned Map/private access. Creator identity is separate from Strapi Admin. |
| Draft Persistence | Upload objects before manifest commit; load private state; enforce expected revision and stale-tab recovery. |
| Publication | Verify immutable release assets and unchanged Draft preconditions before transactional public-pointer switch; preserve prior publication on failure. |
| Public Map Query | Resolve the stable URL to one current Public release; return no private Draft source or account data. |

Retained persistence/publication boundaries follow ADRs 0001–0004 and the pilot scope. Endpoint schemas, exact release encoding, and cleanup state machines need their own confirmed design gate. No discovery, Lore, or regeneration module is implied.

## Phase 1 representation and derivation

- Map resolution is 2048×1024; tiles are 256×256, eight columns by four rows.
- Elevation uses normalized unsigned 16-bit samples. Temperature/moisture use normalized unsigned 8-bit samples. Together the uncompressed fields occupy 8 MiB. Record exact normalized blank defaults during implementation.
- Keep one canonical sample per location. Wrap east/west source lookup; respect finite north/south bounds. Seam copies are presentation only.
- Sea level is the single fixed creation threshold for land/water. Biomes, coastline, shading, depth tint, contours, and color tiles are derived, not independently authored source fields.
- Local painting invalidates affected tiles and required neighbors for derivation. Cover tile edges, wrapped neighbors, and enabled contours; ordinary local strokes should not require full-map recomputation.
- Target-value painting clamps valid ranges and uses fixed map-space stroke spacing, strength, and smooth falloff. Define repeated-pass behavior, endpoint handling, spacing, and enforced radius limits during implementation. Benchmark maximum supported radius.
- Preserve seed while adjusting settings; display effective text/random seed. Specify input normalization/conversion with the generator version. A small fixed golden case set proves exact source and CPU color bytes across Chromium and Firefox. Generator and derivation output changes share the version boundary in ADR 0005.

DOM controls and Pixi input use the same coordinate transform. Space/panning must not paint or intercept typing. Contour toggle defaults off; verify updates and continuity with it on. Review fixed-seed output using the agreed readable palette; screenshot tolerance is narrow and documented for GPU presentation differences.

### Issue #2 creation defaults

The owner confirmed these engineering defaults on 2026-10-05. Creation controls use integer percentages: sea level 0–99; roughness and both Climate Targets 0–100. All numeric controls initially use 50. Convert sea level to a normalized Uint16 threshold by rounding `percentage × 65535 / 100`. Blank elevation is uniformly `max(49152, normalizedSeaLevel + 1)`; temperature and moisture are uniformly 128, independently of generated-terrain Climate Targets.

Normalize text seeds with Unicode NFC and trim surrounding whitespace. An empty normalized seed becomes `atlas`. Display the effective seed and preserve it when other controls change. Random seed selection uses browser cryptographic randomness. Seed conversion and procedural generation are versioned together with derivation under ADR 0005; their exact implemented arithmetic belongs alongside the generator and its compatibility fixtures.

The initial editor route is `/editor` and creates no session until the user chooses Blank or Generated Terrain and submits the form. The static root demo continues to use `StaticMapManifest`. These terrain interfaces remain app-local until another consumer requires an approved shared contract.

The source kernel's initial output version is `terrain-v1`. Seed conversion is unsigned 32-bit FNV-1a over UTF-8 bytes of the version, a NUL separator, and the normalized seed. Generation uses six smooth fixed-point value-noise octaves, beginning with an 8×4 lattice and doubling its dimensions each octave. Horizontal lattice lookup is periodic; vertical lookup is bounded. Elevation and climate use independent hashed channels. Roughness controls octave persistence; temperature also includes a north/south latitude profile. Sea level changes classification metadata rather than regenerating elevation values. Fixed-point interpolation and explicit rounding keep source arithmetic reproducible between supported browsers.

## Creation and failure boundaries

Initialize complete candidate state before committing Session Replacement. A confirmed discard authorizes replacement only on success; cancellation or Worker/allocation failure leaves current fields/art intact and offers retry with the same settings. Do not implement this as durable Map regeneration.

Test recoverable context loss by reconstructing derived rendering from authoritative in-memory fields. Record supported recovery cases and an actionable terminal fallback. Refresh still discards session content; later Draft restore and pilot backup recovery are separate obligations.

## Correctness and performance evidence

Generation duration starts at Generate activation and ends after initial visible tiles plus enabled overlays are presented and pan/zoom/Brush input is ready. Include Worker computation, transfers, derivation, texture upload, and rendering. Check responsiveness independently and offscreen correctness during navigation. Integrate Brush-ready completion with #3 without making its implementation a prerequisite to start #2.

Brush latency starts at each accepted input sample and ends at the first presented frame containing its terrain update. Updates must remain visible during dragging; release must eventually present the complete stroke and queued work. Record input admission/coalescing so rejecting work cannot hide lag. Render submission and requestAnimationFrame alone do not prove physical display presentation; document instrumentation limits and corroborate visible behavior.

Use a production build and a small representative seed/settings case set, including contours on/off:

| Measurement | Protocol and budget |
|---|---|
| First generation | Record separately using a documented fresh-page/Worker procedure; at most 3 seconds. |
| Warm generation | Five warmups, 30 measured generations per case; nearest-rank p95 at most 3 seconds. |
| Brush visibility | At least 100 samples per representative case, including ordinary region, wrapping seam, tile boundary, and maximum supported radius; nearest-rank p95 at most 50 ms. |

Report raw durations, p95, maximum, failures, commit/tree/build, seed/settings, Brush settings/counts, CPU/RAM/GPU, OS, browser version, viewport/DPR, graphics acceleration, and power mode. Repeated harness generation does not create a user-facing regeneration feature.

The original reference description is physical 4-core CPU, 8 GB RAM, integrated GPU, Chromium. The owner deferred choosing/provisioning the actual baseline until final QA preparation before pilot release; any revised VMware baseline requires explicit agreement, not equivalence inferred from vCPU/RAM settings. Native timings are diagnostic. Forced SwiftShader smoke checks prove correctness only. Final baseline and performance sign-off remain pending under #24.

Required future harness work: focused Chromium/Firefox byte comparisons; navigation/painting/focus interactions; seam/dirty-neighbor/contour checks; creation cancellation/failure preservation; supported context recovery; separate hardware benchmark path. Root task verification covers lint/typecheck/unit tests/builds only. None of these planned feature checks is observed passing evidence.

## Persistence, publication, and deployed evidence

Save immutable private assets first, then commit their manifest under ownership and expected-revision checks. Stale tabs must not silently overwrite newer state; define the recovery protocol before #10. Public publication uses a new immutable release prefix, verifies all required objects, and switches the release pointer transactionally. Failures retain the prior committed pointers.

Exercise these rules through interfaces and deployed staging: private denial, save/restore, two-tab conflict, missing-upload rejection, failed publication, and timed Draft/Published restore. Local S3-compatible storage and dependency-maintenance upload/mail tests do not establish browser R2 signing, ownership, invitation, or pilot recovery acceptance. Security limits and reachable-object cleanup must be settled before storing real Creator data; see #24 and the [implementation plan](implementation-plan.md).
