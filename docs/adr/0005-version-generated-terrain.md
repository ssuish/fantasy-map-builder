# Version the Generated Terrain algorithm

A seed and settings must produce the same source fields and rendered starting terrain across desktop Chromium and Firefox for a given algorithm version. Store the generator version with the Map's generation metadata so later algorithm improvements do not silently reinterpret an existing Map. This permits better generation in future versions while requiring compatibility fixtures and an explicit migration or regeneration choice when older versions are retired; exact output is not promised across different algorithm versions.

## Acceptance interpretation — 2026-10-04

The owner confirmed byte-identical source fields and CPU-derived color tiles for a small fixed golden case set in Chromium and Firefox. Presentation screenshots use narrow, documented tolerance for GPU differences; exact final GPU pixels are not required. Version generator and derivation rules together whenever their output changes. This retains the reproducibility guarantee without a broad compatibility framework. Regeneration remains deferred under ADR 0006; retiring versions does not authorize it for the pilot.
