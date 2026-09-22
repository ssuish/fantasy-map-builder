# Fantasy Map Builder

This context describes maps, their authored content, and the people who create and explore them.

## Language

**Map**:
An editable, finite 2D fantasy world representation whose terrain is drawn manually or generated procedurally before further editing. Its east and west edges connect continuously; its north and south edges are boundaries.
_Avoid_: Canvas, project

**Terrain**:
The physical geography depicted by a map, such as land, water, elevation, and biomes.
_Avoid_: Background, base layer

**Elevation Field**:
The smoothly editable elevation value across every location of a map. It determines land, water, and coastline together with sea level.
_Avoid_: Elevation tiles, contour geometry

**Temperature Field**:
The temperature value across every location of a map and one input used to derive its biome.

**Moisture Field**:
The moisture value across every location of a map and one input used to derive its biome.

**Biome**:
The terrain classification derived from elevation, temperature, and moisture at a map location. A biome is not independent source data.
_Avoid_: Biome layer, painted biome

**Terrain Property**:
One editable source property of terrain, such as elevation, temperature, or moisture.
_Avoid_: Brush type, visual layer

**Brush**:
An authoring tool that smoothly changes one or more terrain properties within a selected map area.
_Avoid_: Pen, paint tool

**Generated Terrain**:
Terrain created from procedural rules as a starting point in the same editable form as manually authored terrain.
_Avoid_: Generated image, baked terrain

**Regeneration**:
A confirmed destructive restart of a map's canvas. It replaces terrain, Map Features, Feature Summaries, and Hotspots while preserving Lore Entries; links from preserved Lore Entries to deleted Map Features are removed.
_Avoid_: Terrain edit, partial generation

**Terrain Model**:
The static rules that derive land, water, coastlines, and biomes from elevation, temperature, moisture, and sea level. It does not model change over time, erosion, weather, seasons, or water flow.
_Avoid_: Simulation, world simulation

**Sea Level**:
The elevation threshold separating land from water on a map.

**Coastline**:
The derived boundary where terrain crosses sea level. A coastline is not edited independently.
_Avoid_: Coast path, shoreline layer

**Contour Overlay**:
Optional lines derived from the Elevation Field to communicate height. Contours are display only and are not edited independently.
_Avoid_: Feature Stroke, elevation data

**Map Feature**:
An authored drawing placed on terrain, such as a city, road, river, forest, or magical landmark. It is artistic, may intentionally conflict with terrain data, and is not produced or constrained by the terrain model.
_Avoid_: Terrain property, derived terrain

**Symbol Stamp**:
A built-in reusable drawing placed to depict a city, tree, mountain, landmark, or similar Map Feature.
_Avoid_: Uploaded asset, Point of Interest

**Feature Stroke**:
An authored line depicting a road, river, or similar linear Map Feature.
_Avoid_: Terrain Brush, pathfinding route

**Freehand Drawing**:
Artwork a Creator draws directly with a pen-style tool instead of placing Symbol Stamps.
_Avoid_: Terrain Brush, uploaded asset

**Point of Interest**:
A notable, localized Map Feature exposed to Explorers through a Hotspot, such as a city or magical forest.
_Avoid_: Every Map Feature, Hotspot

**Hotspot**:
A visible or invisible interactive point with an adjustable interaction radius, placed over artwork. Selecting it reveals the Point of Interest's Feature Summary and linked Lore Entries.
_Avoid_: Map Feature, Symbol Stamp

**Feature Summary**:
A short description shown when an Explorer selects a Map Feature.
_Avoid_: Lore Entry, blog post

**Lore Entry**:
A timeless in-world reference about history, people, factions, places, or related subjects. A Lore Entry can link to other Lore Entries and multiple Map Features, and each Map Feature can link to multiple Lore Entries.
_Avoid_: Feature Summary, blog post

**Lore**:
The public collection of a map's Lore Entries.
_Avoid_: Blog, feed

**Lore Tag**:
A Creator-defined label used to group, browse, and search Lore Entries within one map.
_Avoid_: Biome, Map Feature type

**Creator**:
An authenticated person who can own and edit multiple maps. Each map has exactly one Creator.
_Avoid_: Collaborator, editor

**Creator Profile**:
A public page containing a Creator's display name, simple biography, and Public Maps. It excludes email addresses and Unlisted Maps.
_Avoid_: Account, admin profile

**Explorer**:
A person who anonymously views and interacts with a published map without editing it or needing an account.
_Avoid_: Editor, player

**Draft**:
The Creator's editable map state, including terrain, Map Features, and Lore. Changes remain invisible to Explorers until publication.
_Avoid_: Working map, unpublished map

**Published Version**:
The stable terrain, Map Features, and Lore currently visible to Explorers. They change together only when the Creator publishes the Draft.
_Avoid_: Live draft, public draft

**Public Map**:
A published map accessible by URL and eligible for site discovery and search.
_Avoid_: Unlisted Map, Draft

**Unlisted Map**:
A published map accessible anonymously by its URL but omitted from site discovery and search.
_Avoid_: Private map, Public Map
