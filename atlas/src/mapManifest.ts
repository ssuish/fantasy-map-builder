import {
  parseStaticMapManifest,
  type StaticMapManifest,
} from "@atlas/contracts";

export async function loadStaticMapManifest(
  url: string,
): Promise<StaticMapManifest> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Manifest request failed with status ${response.status}.`);
  }

  return parseStaticMapManifest(await response.json());
}
