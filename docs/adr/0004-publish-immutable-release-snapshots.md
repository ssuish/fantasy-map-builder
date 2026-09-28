# Publish immutable release snapshots

Build each Published Version under a new immutable R2 release prefix, validate every required object, and then transactionally switch the map's `publishedReleaseId` and search projections in Neon. Do not overwrite public asset keys or expose Strapi's mutable per-document Draft/Publish state directly; immutable snapshots keep the prior map available during failures and make map-wide publication coherent across terrain, Points of Interest, and Lore, at the cost of a short-lived second asset copy and cleanup work.
