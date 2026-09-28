import assert from "node:assert/strict";
import test from "node:test";
import { parseStaticMapManifest } from "../dist/index.js";

const manifest = {
  schemaVersion: 1,
  mapId: "demo",
  title: "Demo Map",
  width: 2048,
  height: 1024,
  imageUrl: "/maps/demo/map.svg",
};

test("accepts a static map manifest", () => {
  assert.deepEqual(parseStaticMapManifest(manifest), manifest);
});

test("rejects a manifest with incompatible dimensions", () => {
  assert.throws(() => parseStaticMapManifest({ ...manifest, width: 1024 }), TypeError);
});
