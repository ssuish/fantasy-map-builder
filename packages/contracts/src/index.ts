export interface StaticMapManifest {
  schemaVersion: 1;
  mapId: string;
  title: string;
  width: 2048;
  height: 1024;
  imageUrl: string;
}

export function parseStaticMapManifest(value: unknown): StaticMapManifest {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("Static map manifest must be an object");
  }

  const manifest = value as Record<string, unknown>;
  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.mapId !== "string" ||
    manifest.mapId.length === 0 ||
    typeof manifest.title !== "string" ||
    manifest.title.length === 0 ||
    manifest.width !== 2048 ||
    manifest.height !== 1024 ||
    typeof manifest.imageUrl !== "string" ||
    manifest.imageUrl.length === 0
  ) {
    throw new TypeError("Invalid static map manifest");
  }

  return manifest as unknown as StaticMapManifest;
}
