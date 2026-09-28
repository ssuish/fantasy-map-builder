# Version the Generated Terrain algorithm

A seed and settings must produce the same source fields and rendered starting terrain across desktop Chromium and Firefox for a given algorithm version. Store the generator version with the Map's generation metadata so later algorithm improvements do not silently reinterpret an existing Map. This permits better generation in future versions while requiring compatibility fixtures and an explicit migration or regeneration choice when older versions are retired; exact output is not promised across different algorithm versions.
