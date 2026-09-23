import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStaticMapManifest } from "../src/mapManifest";

describe("loadStaticMapManifest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests and validates the static map manifest", async () => {
    const manifest = {
      schemaVersion: 1,
      mapId: "eldoria",
      title: "The Shattered Reach",
      width: 2048,
      height: 1024,
      imageUrl: "/maps/eldoria/world-map.svg",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => manifest });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadStaticMapManifest("/maps/eldoria/manifest.json"),
    ).resolves.toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledWith("/maps/eldoria/manifest.json", {
      headers: { Accept: "application/json" },
    });
  });

  it("reports failed manifest requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(loadStaticMapManifest("/offline.json")).rejects.toThrow(
      "status 503",
    );
  });

  it("rejects manifest data that violates the shared contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ schemaVersion: 1, mapId: "eldoria", width: 10 }),
      }),
    );
    await expect(loadStaticMapManifest("/bad.json")).rejects.toThrow(
      "Invalid static map manifest",
    );
  });
});
