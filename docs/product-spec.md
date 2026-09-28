# Fantasy Map Builder MVP Product Specification

## Product goal

Fantasy Map Builder lets a Creator make a hand-authored, interactive fantasy map and publish it as an explorable world. Terrain follows a small, understandable physical model; fantasy artwork and Lore remain under the Creator's control.

The MVP succeeds when one Creator can move through the complete journey from an empty or generated map to a stable public URL, and an anonymous Explorer can understand that world through the map and its Lore.

Canonical domain language lives in [`../CONTEXT.md`](../CONTEXT.md).

## Users

### Creator

- Signs in through Google OAuth managed by Strapi.
- Owns and edits multiple maps.
- Has a minimal public profile with display name, biography, and Public Maps.
- Is the only editor of each owned map.

### Explorer

- Does not need an account.
- Opens Public or Unlisted Maps by URL.
- Can pan, zoom, search, inspect Points of Interest, and read Lore.
- Cannot modify maps or content.

### Administrator

- Uses Strapi Admin; Creators never do.
- Reviews reports submitted through an external Google Form.
- Can unlist or unpublish maps and suspend Creators.

## Primary journey

1. A Creator signs in with Google.
2. They create a 2048×1024 horizontally wrapping map from blank terrain or procedural generation.
3. They paint elevation, temperature, moisture, and freehand artwork.
4. They add roads, rivers, Symbol Stamps, Hotspots, Feature Summaries, and linked Lore Entries.
5. They publish the complete map as either Public or Unlisted.
6. An anonymous Explorer pans, zooms, searches, toggles markers and contours, opens Hotspots, and reads Lore.
7. The Creator continues editing a private Draft. Explorers keep seeing the last Published Version until the Creator republishes.

## Creator experience

### Map creation

- One fixed map format: 2048×1024.
- East and west edges join continuously; north and south are finite boundaries.
- Start from a blank map or a generated starting canvas.
- Generator controls: seed, sea level or land coverage, terrain roughness, average temperature, and average moisture.
- Regeneration is not an editing tool. It requires an explicit destructive warning.
- Regeneration deletes terrain, freehand artwork, roads, rivers, stamps, Feature Summaries, and Hotspots. Lore Entries survive, but links to deleted Points of Interest are removed.

### Terrain

- Smooth raster painting; no visible square or hex grid.
- Editable source fields: elevation, temperature, and moisture.
- Derived output: land, water, coastline, biomes, hill-shading, water-depth tint, and contour lines.
- Sea level determines land and water from elevation.
- Biomes are derived from elevation, temperature, and moisture. There is no biome brush.
- Contours are a display overlay. The Creator chooses the published default; each Explorer may override visibility locally.
- One built-in fantasy terrain palette in MVP.

### Artwork and features

- Built-in hand-drawn fantasy atlas style with dark ink, slightly imperfect lines, transparent backgrounds, and tintable accents.
- Symbol Stamps cover cities, trees, mountains, and landmarks.
- Feature Strokes cover roads and rivers.
- Freehand pen and eraser tools support custom artwork.
- Artwork may intentionally contradict terrain data. The terrain model guides but never constrains fantasy art.
- Fixed layer order:
  1. Derived terrain and contours.
  2. Freehand artwork.
  3. Rivers and roads.
  4. Symbol Stamps.
  5. Hotspots.
- Layer visibility can be toggled while editing. Creators cannot add, rename, reorder, group, or blend layers.
- Symbol Stamps can be moved, resized, rotated, and deleted.
- Hotspots can be moved, assigned a click radius, shown or hidden, and deleted.
- Roads and rivers can be selected, restyled, or deleted; reshaping means redrawing.
- Freehand artwork is erased or repainted rather than edited as vectors.
- Terrain is changed by repainting.

### Interactive content and Lore

- A Creator places a visible or invisible Hotspot over artwork to make a Point of Interest interactive.
- Each Hotspot is a point with an adjustable click radius.
- Selecting a Hotspot shows a short Feature Summary and linked Lore Entries.
- Points of Interest and Lore Entries have a many-to-many relationship.
- Lore Entries can also link to other Lore Entries.
- Lore Entry fields: title, summary, rich-text body, optional cover image, inline images, and Lore Tags.
- Lore is timeless in-world reference material. There is no separate Blog or Blog Post model.
- No comments, ratings, embeds, or scheduled publishing.

### Saving and publishing

- Draft autosaves after each completed action or stroke.
- Undo and redo apply only to the current editor session.
- Refreshing or closing the editor clears undo history.
- There is no user-facing revision history or rollback.
- Publish is explicit and map-wide: terrain, artwork, Points of Interest, Feature Summaries, and Lore become public together.
- Publish failure leaves the prior Published Version unchanged.
- Draft is always private.
- Published visibility is either:
  - Public: available by URL and in site discovery/search.
  - Unlisted: available anonymously by URL but excluded from discovery/search.

## Explorer experience

- Pan and zoom the map with seamless horizontal wrapping.
- Select Hotspots and open linked Lore.
- Search Lore and Points of Interest within a map.
- Toggle visible Hotspot markers.
- Toggle contour visibility locally.
- Browse newest and recently updated Public Maps.
- Search public content by map title, Creator display name, Lore text, Point of Interest name, and Lore Tags.
- View minimal Creator profiles and their Public Maps.
- Unlisted Maps never appear in search, discovery, or Creator profiles.

## Moderation and deletion

- A Report action opens an external Google Form.
- The sole Administrator reviews reports manually in Strapi.
- The Administrator can unlist or unpublish maps and suspend Creators. Administrator-unlisted Maps remain available by direct URL but leave discovery, search, and Creator profiles.
- Automated text or image moderation is outside MVP.
- Unpublishing, suspension, and deletion immediately remove affected maps from public map routes, discovery, and search.
- Deleting a map requires typed-name confirmation and permanently removes database and R2 data asynchronously. Existing direct URLs to immutable public assets may remain readable until cleanup and cache expiry; the immediate access rule applies to map routes, discovery, and search.
- Deleting a Creator account applies the same process to every owned map.
- MVP has no recycle bin or recovery.

## Device and browser scope

- Creator editor: desktop or laptop with mouse or pen.
- Explorer: responsive desktop, tablet, and phone.
- Touch-first editing on phones and tablets is a later iteration.
- Production rendering uses PixiJS WebGL. Browsers without required WebGL support receive a clear unsupported-browser message.

## Non-goals

- Collaborative or real-time editing.
- Map version history, named releases, or public timelines.
- Arbitrary canvas dimensions, infinite canvases, globes, or vertical wrapping.
- Dynamic seasons, weather, erosion, hydrology, or time-based simulation.
- Automatic rivers, roads, settlements, or fantasy features.
- Uploaded brush packs, custom icons, arbitrary layer systems, or palette editors.
- Print, PNG, PDF, or editable project-file export.
- Explorer accounts, comments, reactions, following, rankings, recommendations, or social feeds.
- Touch-first Creator editing.

## MVP acceptance criteria

- A deterministic seed and generator settings produce the same starting terrain.
- Painting across the east/west seam produces a continuous result.
- Coastline and biome output updates from source fields without independent coastline or biome data.
- Draft autosave survives refresh without changing the Published Version.
- A stale editor tab cannot silently overwrite a newer Draft.
- Failed publication never exposes a partial release.
- Public and Unlisted visibility behave as defined.
- Anonymous Explorers can load and navigate a Published Version without Strapi credentials.
- Global discovery and search never return Draft or Unlisted content; within-map search works on any accessible Published Version.
- Unpublishing, suspension, and deletion immediately stop public map resolution and remove affected results from discovery and search.
- Regeneration and permanent deletion require explicit confirmation and honor their documented deletion scope.

