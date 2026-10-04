# Private pilot data model

This document owns retained entities and invariants. [CONTEXT.md](../CONTEXT.md) defines vocabulary; [technical design](technical-design.md) owns terrain representation and module boundaries. The current shared package validates only the static demo manifest. The model below is a target, not a deployed Strapi schema or an approved wire contract.

## Retained entities

| Entity | Role and relationship |
|---|---|
| Creator | Invited Strapi-authenticated identity; owns one Map. No public Creator Profile is required. |
| Map | Fixed world owned by exactly one Creator; stable public identity and private/public state references. |
| Editing Session | Disposable in-memory fields and authored content; not a saved Draft or database row. |
| Canvas Document | Canonical retained terrain, freehand artwork, and road/river Feature Strokes. Session history is separate from saved content. |
| Generation metadata | Effective seed, generator/derivation version, and creation settings identifying reproducible starting terrain. |
| Draft | Private committed Canvas Document and revision. Save/restore becomes durable only with persistence work. |
| Published Version | Immutable complete release of retained content, selected by the Map's current public pointer. |
| Object reference | Private Draft or immutable public release asset reference verified before pointer commit. Exact metadata/encoding awaits contract design. |

Elevation, temperature, and moisture fields are authoritative. Derived color, coastlines, biomes, shading, water tint, and contours are reproducible presentation rather than independent editable truth. See technical design for sample types, tiling, generation equality, and dirty-neighbor handling.

Freehand artwork and Feature Strokes remain independent from terrain. A road or river is authored artwork, not a computed hydrology/pathfinding result. Store canonical geometry/content once; presentation may create horizontal seam copies. Exact coordinates, stroke encoding, freehand object format, and persistence references must be settled before the Canvas Document persistence gate.

## Invariants

1. Every private read/mutation checks authenticated invitation and ownership. One Creator owns one Map; exactly one Creator owns each Map.
2. East/west source and authored coordinates represent a single canonical world; stored content has no seam duplicates. North/south is finite.
3. Generated and blank sessions share the same initialized field representation and painting/rendering paths. Derived data cannot independently change source truth.
4. Failed/cancelled Session Replacement preserves current in-memory content. It changes no durable owned Map.
5. A Draft revision advances only after every referenced private object exists and the expected revision matches. Failed save preserves the last committed Draft.
6. A public pointer resolves one verified immutable release. Failed publish preserves the previous Published Version; private edits do not alter it.
7. Anonymous public responses expose only retained published content, not private source manifests or account fields.
8. Cleanup preserves every object reachable from current Draft and Published Version. Define retention/retry behavior before accepting real data.
9. Session undo history is not a durable revision history. Refresh can lose in-memory edits until persistence is implemented.

## Contract gates still open

Define retained Canvas Document and public release schemas before persistence/publication implementation. Confirm revision semantics, stale-tab recovery, manifest commit order, object verification, publication preconditions/retries, and retention/cleanup at their respective issue gates. Invitation mechanism/access limit and backup/restore ownership remain pre-pilot decisions.

Do not promote archived proposed content types or endpoints into current contracts. Lore, Hotspots, search projections, Creator Profile pages, Unlisted visibility, moderation/deletion models, and durable regeneration are outside the pilot. The [implementation plan](implementation-plan.md) owns ordering; GitHub issues own acceptance/status.
