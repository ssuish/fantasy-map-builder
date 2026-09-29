# Private pilot scope decision

Recorded 2026-09-29 after reviewing the Phase 0 code, CONTEXT.md, ADRs 0001–0005, product and technical plans, build evidence, and GitHub issues #2–#20. This records scope, not implementation or passing acceptance.

## Goal

Each invited Creator can make one horizontally wrapping Map, save a private Draft, publish to a stable URL, continue editing privately, and safely republish. An anonymous Explorer can pan and zoom the current Published Version. This is a private pilot: Creator access is limited, while published URLs are anonymously readable.

## Keep

- One fixed 2048×1024 Map per Creator; blank or deterministic generated terrain; elevation, temperature, and moisture painting.
- Derived land, water, coastline, biomes, and essential rendering; horizontal wrapping and bounded north/south navigation.
- Freehand pen and eraser, basic road and river Feature Strokes, fixed layer order, and session undo/redo.
- Google sign-in through Strapi, ownership checks, private Draft save and restore, expected-revision conflicts, upload-before-manifest ordering, and failed-upload recovery.
- Explicit Public publication and republishing of the complete retained Draft as immutable releases. A failed publish leaves the prior Published Version available.
- Existing staging providers: Firebase Hosting, Cloud Run/Strapi, Neon staging, and R2, through one documented deployment path. Before inviting Creators, document backup ownership and retention and successfully exercise recovery of a saved Draft and current Published Version.

## Defer

- Symbol Stamps, Hotspots, Points of Interest, Feature Summaries, Lore, images, tags, relations, and search.
- Unlisted visibility, global discovery, Creator Profile pages, moderation controls, map/account deletion, regeneration, and touch-first Creator editing.
- Production domains and infrastructure, broad dashboards, and public-launch operations. Basic abuse protection for pilot sign-in and uploads is still required. Backup and restore proof for pilot data is a pilot gate.

## Design and acceptance gates

1. Define canonical Canvas Document and public release schemas for retained content. Stored state has no seam-rendering duplicates.
2. Define Draft revision protocol, stale-tab recovery, ownership policy, and upload commit order.
3. Define publication states, asset verification, pointer-switch preconditions, retries, and failure cleanup.
4. Before pilot acceptance, integration tests prove private Draft denial, save/restore, two-tab conflict, missing-upload rejection, and failed-publish preservation. Exercise a timed backup restore of a saved Draft and Published Version before real Creator data is accepted.

## Issue sequence

Complete #19 before #2. Deliver #2 and #3, then #4 and reduced #6; defer #5. Define the reduced Canvas Document contract before persistence. Deliver reduced #7 ownership, #8 private terrain saving, #9 complete retained-content saving, and #10 conflict/upload recovery. #8 depends on #7; #9 depends on #8; #10 depends on #9. Deliver reduced #14 only after Draft and ownership integration evidence, then reduced #15 anonymous viewing. Defer #11–#13 and #16–#18. Pilot recovery, invitation, and basic abuse controls are tracked in #24. #20 is a closed historical outline for future public-launch operations; a new launch ticket requires a later scope decision.

Pilot issue acceptance and dependencies were revised on 2026-09-29. Deferred issues #5, #11–#13, #16–#18 and public-launch issue #20 were closed as not planned for the pilot; their issue bodies remain historical. #19 remains the current ready-for-work gate. Planned checks and labels are not passing evidence.

## Remaining implementation choices

- Choose the exact reference device or runner and run count for Phase 1 performance acceptance.
- Define retention and cleanup for superseded releases and unreferenced Draft objects before storing pilot data.
- Define the Creator invitation mechanism and access limit before pilot sign-in deployment.
