# Private pilot product specification

This is the current product boundary, incorporating the private-pilot scope decision and the owner-confirmed Phase 1 questionnaire (#27, 2026-10-04). [CONTEXT.md](../CONTEXT.md) defines domain language. [Technical design](technical-design.md) owns implementation and measurement rules; live GitHub issues own actionable acceptance and shared status. Earlier broad MVP proposals are preserved in [the archive](archive/2026-10-04-agent-docs/README.md).

## Goal and audience

An invited Creator makes one Map, saves a private Draft, publishes to a stable public URL, continues editing privately, and safely republishes. An anonymous Explorer opens that URL and pans/zooms the current Published Version. Invitations limit Creator access; published URLs remain anonymously readable. Strapi Admin is a separate operator interface, not the Creator editor.

The private pilot succeeds only after the retained create–save–publish–view journey and deployed data recovery are exercised. The current static prototype does not establish editor or pilot acceptance. [Implementation plan](implementation-plan.md) records sequencing and authorization.

## Creation and terrain editing

- One fixed 2048×1024 Map per invited Creator. East/west wraps continuously; north/south is finite. Desktop Creator editing uses mouse or pen; touch-first editing is deferred. Explorer viewing is responsive.
- Start an in-memory Editing Session with blank or deterministic Generated Terrain. Blank terrain has all three fields initialized as uniform flat land above sea level with neutral temperature/moisture.
- Creation controls include a text seed, a random-seed action, the displayed effective seed, sea level, roughness, and temperature/moisture Climate Targets. Keep the seed when other creation settings change. Climate Targets influence distributions without guaranteeing arithmetic means; sea level determines land/water without promising land coverage percentages.
- Choose sea level at creation and keep it fixed throughout the session. Global sea-level editing may be reconsidered after v1 if users request it; it is not promised future work.
- An explicit “Discard session and start new Map” confirmation replaces the disposable in-memory session. Cancellation or failed creation preserves it; successful creation replaces it as one complete result. This is Session Replacement, not regeneration of a durable owned Map.
- Elevation, temperature, and moisture are editable source fields. Land/water, coastline, biomes, hill-shading, depth tint, and contours derive from them. Artwork can intentionally contradict terrain; no biome or coastline Brush exists.
- Each Terrain Property Brush paints toward a chosen target with radius, strength, and smooth falloff. Radius remains fixed in map space, has enforced minimum/maximum limits, and uses a preview that scales with zoom. Equivalent paths behave consistently regardless of pointer event frequency. Raise/lower and smoothing modes are deferred.
- Primary drag paints with a Brush selected. Space+drag or a visible Pan tool pans; wheel zooms around the pointer. DOM zoom-in/out/fit controls have keyboard access, and gestures respect typing and focused controls.
- Use one readable fantasy palette with distinct biome/depth colors, visible coastlines, and restrained hill-shading. Include a contour toggle, default off. The owner reviews fixed-seed screenshots before visual acceptance. [DESIGN.md](../DESIGN.md) owns interface styling.
- Creation offers actionable errors and retry with the same settings. Preserve the old session on failed replacement. Rebuild rendering after recoverable graphics context loss from authoritative in-memory fields; document tested limits and clear terminal fallback.

The first editing slices operate only in memory. Refresh or session termination loses unsaved content. Durable saving and sign-in arrive later; early editor work makes no durable recovery promise.

## Artwork and session history

Retain Freehand Drawing with pen/eraser and basic road/river Feature Strokes. Render fixed layers in order: derived terrain/contours, Freehand Drawing, then road/river strokes. Terrain remains independent from authored artwork. Session undo/redo covers retained editing actions when its slice is implemented; undo history is not a durable revision history. Artwork/session details must be settled against #4/#6 before implementation rather than imported from archived stamp or Hotspot requirements.

## Ownership, Drafts, and publication

- Creator sign-in uses Google through Strapi. Every private operation verifies invitation and ownership; each Map has exactly one Creator and each invited Creator owns one Map.
- A Draft stays private and can be saved/restored. Save immutable objects before committing a manifest that references them. Expected-revision conflicts protect newer state from stale tabs.
- Publish and republish are explicit, Public, and cover the complete retained Draft. Produce an immutable Published Version and switch the stable public URL only after required assets are verified.
- Failed save/publish preserves the last committed Draft/Published Version. Editing a Draft does not change Explorer content until a successful publication.
- Explorers need no account and cannot edit. Public viewing resolves one coherent Published Version; anonymous clients cannot fetch private Draft data.

Exact Draft/release schemas, invitation mechanism, conflict recovery, and cleanup rules are future design gates in the implementation plan. Their absence is not permission to choose archived broader schemas.

## Acceptance and release constraints

Prove continuous seams and finite boundaries, cross-browser starting-terrain determinism, incremental derivation, responsive generation/painting, and visual readability. Use the [technical measurement protocol](technical-design.md#correctness-and-performance-evidence) for cold/warm generation and per-sample Brush budgets.

Native hardware provides development diagnostics. The owner will choose/provision the final performance acceptance environment during final QA preparation before pilot release. VMware is proposed, not approved as equivalent to the original physical baseline. Pending performance evidence blocks sign-off and pilot release, not implementation.

Before real Creator data or invitations, prove ownership isolation, Draft save/restore, stale-tab conflicts, upload-before-manifest rejection, failed-publish preservation, and a timed restore of a saved Draft plus current Published Version. Retain existing Firebase Hosting, Cloud Run/Strapi, Neon staging, and R2 deployment path. #24 owns invitation controls, basic abuse limits, backup/retention ownership, and deployed recovery evidence.

## Outside the pilot

Symbol Stamps, regeneration, Hotspots, Points of Interest, Feature Summaries, Lore, uploaded Lore images, tags/relations, Unlisted mode, discovery/search, Creator Profile pages, moderation/deletion workflows, production launch, and touch-first editing are deferred. Closed deferred issues are historical, not completed capabilities. Collaboration, arbitrary canvas sizes, vertical wrapping, simulation, export, and custom asset/layer systems are also outside this release. Reopening deferred work requires an explicit scope decision.
