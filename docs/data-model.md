# Fantasy Map Builder MVP Data Model

## Modeling principles

- PostgreSQL owns queryable identity, ownership, authoring content, relations, visibility, moderation, and current pointers.
- R2 owns large binary editor state and immutable public release packages.
- Draft content is mutable authoring state. A Published Version is an immutable projection, not a second editable graph.
- IDs used in URLs are stable slugs or opaque public IDs; database primary keys and R2 credentials are never exposed as authorization.
- Every map-owned record carries or resolves to `mapId`, enabling one ownership check and complete deletion.

## Strapi content types

### CreatorProfile

One-to-one with the Strapi Users & Permissions user.

| Field | Type | Notes |
|---|---|---|
| `user` | relation | Required; unique; private |
| `slug` | UID/string | Public, unique, stable after explicit change |
| `displayName` | string | Public |
| `bio` | text | Public, length-limited |
| `avatarUrl` | string | Public Google avatar or mirrored safe URL |
| `status` | enum | `active`, `suspended`, `deleted` |
| `createdAt` / `updatedAt` | timestamp | Operational |

Email, provider tokens, provider subject, and Strapi role data remain on the private user record and never enter public projections.

### Map

| Field | Type | Notes |
|---|---|---|
| `owner` | relation | Required CreatorProfile; immutable ownership in MVP |
| `title` | string | Required |
| `slug` | UID/string | Unique per Creator |
| `description` | text | Public when published |
| `width` / `height` | integer | Fixed to `2048` / `1024` in MVP |
| `visibility` | enum | `public`, `unlisted`; Draft is always private |
| `moderationStatus` | enum | `clear`, `unlisted`, `unpublished` |
| `draftRevision` | bigint | Monotonic optimistic-concurrency token |
| `draftManifestKey` | string | Private R2 key |
| `publishedReleaseId` | UUID/string | Nullable pointer to current release |
| `publishedAt` | timestamp | Nullable |
| `defaultContoursVisible` | boolean | Published display default |
| `createdAt` / `updatedAt` | timestamp | Operational |
| `deletionStatus` | enum | `active`, `deleting` |

Uniqueness: `(owner, slug)`. Direct public resolution uses `(creatorSlug, mapSlug)` and rejects suspended, deleted, and unpublished states. Administrator-unlisted Maps remain available by direct URL but are excluded from discovery, search, and Creator Profiles.

### PointOfInterest

| Field | Type | Notes |
|---|---|---|
| `map` | relation | Required |
| `name` | string | Required; searchable |
| `summary` | rich text/blocks | Short, sanitized |
| `x` | decimal/float | Normalized; canonical range `[0, 1)` |
| `y` | decimal/float | Normalized; range `[0, 1]` |
| `radius` | decimal/float | Positive map-space interaction radius |
| `markerVisible` | boolean | Explorer marker visibility |
| `loreEntries` | many-to-many | Same-map constraint |
| `createdAt` / `updatedAt` | timestamp | Operational |

A Point of Interest represents interaction over artwork. It does not own or require a stamp/freehand object ID.

### LoreEntry

| Field | Type | Notes |
|---|---|---|
| `map` | relation | Required |
| `title` | string | Required; searchable |
| `slug` | UID/string | Unique within map |
| `summary` | text | Search/result preview |
| `body` | Strapi Blocks/rich text | Sanitized during publication |
| `coverAssetKey` | string | Private R2 key before publication |
| `inlineAssets` | repeatable component | R2 key, alt text, caption |
| `tags` | many-to-many | LoreTag; same-map constraint |
| `relatedEntries` | self many-to-many | Same-map constraint; no self-link |
| `pointsOfInterest` | many-to-many | Inverse relationship |
| `createdAt` / `updatedAt` | timestamp | Operational |

### LoreTag

| Field | Type | Notes |
|---|---|---|
| `map` | relation | Required |
| `name` | string | Required |
| `slug` | UID/string | Unique within map |
| `entries` | many-to-many | Inverse relationship |

Uniqueness: `(map, slug)` and case-insensitive `(map, name)`.

## Backend-owned operational tables

These tables are managed by the custom Strapi application/module rather than exposed as generic public content types.

### PublishedRelease

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Release ID and immutable R2 prefix |
| `mapId` | relation/key | Required |
| `sourceDraftRevision` | bigint | Draft used to create release |
| `status` | enum | `uploading`, `ready`, `active`, `superseded`, `abandoned` |
| `manifestKey` | string | Public R2 key |
| `baseMapKey` | string | Public R2 key |
| `contoursKey` | string | Nullable public R2 key |
| `thumbnailKey` | string | Public R2 key |
| `createdAt` / `activatedAt` | timestamp | Operational |

Only the `Map.publishedReleaseId` target is publicly current. Superseded rows exist only during a short cleanup window and are not user-visible history.

### SearchDocument

Materialized only from active Public Maps during publication.

| Field | Type | Notes |
|---|---|---|
| `mapId` | key | Required |
| `releaseId` | key | Required; lets replacement happen transactionally |
| `kind` | enum | `map`, `creator`, `lore`, `poi` |
| `sourcePublicId` | string | Stable public identifier |
| `title` | string | Result title |
| `body` | text | Sanitized plain text |
| `tags` | text array | Normalized Lore Tags |
| `searchVector` | PostgreSQL `tsvector` | GIN indexed |
| `updatedAt` | timestamp | Ranking/display |

Unlisted Maps, including those unlisted by an Administrator, have no global SearchDocument rows. Per-map Explorer search is included in the immutable public manifest and runs locally for MVP-scale content.

### CleanupJob

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Idempotency key |
| `kind` | enum | `abandoned_release`, `superseded_release`, `draft_gc`, `delete_map`, `delete_creator` |
| `scopeId` | string | Map, Creator, or release identifier |
| `status` | enum | `pending`, `running`, `complete`, `failed` |
| `attempts` | integer | Bounded retry count |
| `runAfter` | timestamp | Backoff/safety window |
| `lastErrorCode` | string | No secret/content body |

## R2 object model

### Private bucket

```text
drafts/{mapId}/terrain/{field}/{tileX}-{tileY}/{checksum}.bin
drafts/{mapId}/art/{tileX}-{tileY}/{checksum}.png
drafts/{mapId}/manifests/{checksum}.json
drafts/{mapId}/lore-assets/{assetId}/{checksum}
```

Objects are immutable. A new save uploads new content-addressed objects and then commits one manifest pointer. Garbage collection retains only objects reachable from the current Draft and an in-progress publication.

### Public bucket

```text
releases/{mapId}/{releaseId}/manifest.json
releases/{mapId}/{releaseId}/map.webp
releases/{mapId}/{releaseId}/contours.webp
releases/{mapId}/{releaseId}/thumbnail.webp
releases/{mapId}/{releaseId}/lore/{assetId}/{checksum}
```

Release keys are immutable and receive long-lived cache headers. The manifest is also immutable because every publication uses a new `releaseId`.

## Referential rules

- Creator owns many Maps; Map has exactly one Creator.
- Map owns Points of Interest, Lore Entries, Lore Tags, Draft manifest pointer, and Published Releases.
- Point of Interest ↔ Lore Entry is many-to-many and same-map only.
- Lore Entry ↔ Lore Entry is many-to-many and same-map only.
- Lore Entry ↔ Lore Tag is many-to-many and same-map only.
- Regeneration deletes Points of Interest and Draft canvas objects, preserves Lore Entries and Lore Tags, and removes affected relationships.
- Map deletion first removes public eligibility and pointer access, then deletes all owned rows and R2 prefixes asynchronously.
- Creator deletion applies map deletion to every owned map before removing/anonymizing the private user record.

## State invariants

- `draftRevision` increases only after all referenced private R2 objects exist.
- `publishedReleaseId` points only to a `ready` or `active` release whose required public objects exist.
- A release records exactly one source Draft revision.
- A Public or Unlisted Map with no `publishedReleaseId` is not resolvable publicly.
- A suspended Creator has no publicly resolvable maps regardless of map visibility.
- Global search rows exist only for the currently active release of a Public Map with clear moderation status and an active Creator.
- Public payloads never query mutable Draft content.
- X coordinates normalize modulo 1; no duplicate seam entities exist.
- Lore and Point of Interest relations never cross map ownership.

