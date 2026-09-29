export interface StaticMapManifest {
  schemaVersion: 1;
  mapId: string;
  title: string;
  width: 2048;
  height: 1024;
  imageUrl: string;
}

const mapImagePath = /\.(?:svg|png|jpe?g|webp|avif)$/i;

function isSupportedMapImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;

  try {
    const url = new URL(value, "https://atlas.invalid");
    return (url.protocol === "http:" || url.protocol === "https:") &&
      mapImagePath.test(url.pathname);
  } catch {
    return false;
  }
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
    !isSupportedMapImageUrl(manifest.imageUrl)
  ) {
    throw new TypeError("Invalid static map manifest");
  }

  return manifest as unknown as StaticMapManifest;
}
