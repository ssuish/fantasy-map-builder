import { describe, expect, it } from "vitest";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  TERRAIN_VERSION,
  DEFAULT_TERRAIN_SETTINGS,
} from "../src/terrain/types";
import {
  clampY,
  sampleIndex,
  tileCoordinates,
  tileIndex,
  wrapX,
} from "../src/terrain/coordinates";
import {
  createTerrain,
  hashSeed,
  normalizeSeed,
  normalizeSettings,
} from "../src/terrain/generation";

function digest(values: ArrayLike<number>): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < values.length; index += 1) {
    hash = Math.imul(hash ^ values[index], 0x01000193) >>> 0;
  }
  return hash;
}

describe("terrain coordinates and public constants", () => {
  it("describes the fixed world and tiles", () => {
    expect({
      MAP_WIDTH,
      MAP_HEIGHT,
      TILE_SIZE,
      TILE_COLUMNS,
      TILE_ROWS,
    }).toEqual({
      MAP_WIDTH: 2048,
      MAP_HEIGHT: 1024,
      TILE_SIZE: 256,
      TILE_COLUMNS: 8,
      TILE_ROWS: 4,
    });
    expect(TERRAIN_VERSION).toBe("terrain-v1");
    expect(DEFAULT_TERRAIN_SETTINGS).toEqual({
      seed: "atlas",
      seaLevel: 50,
      roughness: 50,
      temperatureTarget: 50,
      moistureTarget: 50,
    });
  });

  it("wraps horizontal samples and clamps finite vertical samples", () => {
    expect(wrapX(0)).toBe(0);
    expect(wrapX(MAP_WIDTH)).toBe(0);
    expect(wrapX(-1)).toBe(MAP_WIDTH - 1);
    expect(wrapX(12.9)).toBe(12);
    expect(clampY(-1)).toBe(0);
    expect(clampY(MAP_HEIGHT + 10)).toBe(MAP_HEIGHT - 1);
    expect(clampY(12.9)).toBe(12);
    expect(sampleIndex(-1, MAP_HEIGHT + 4)).toBe(
      (MAP_HEIGHT - 1) * MAP_WIDTH + MAP_WIDTH - 1,
    );
    expect(() => wrapX(Number.NaN)).toThrow(RangeError);
    expect(() => clampY(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("wraps tile columns and bounds tile rows", () => {
    expect(tileIndex(-1, -1)).toBe(0 * TILE_COLUMNS + (TILE_COLUMNS - 1));
    expect(tileIndex(TILE_COLUMNS, TILE_ROWS)).toBe(
      (TILE_ROWS - 1) * TILE_COLUMNS,
    );
    expect(tileCoordinates(0)).toEqual({ column: 0, row: 0 });
    expect(tileCoordinates(TILE_COLUMNS * TILE_ROWS - 1)).toEqual({
      column: TILE_COLUMNS - 1,
      row: TILE_ROWS - 1,
    });
    expect(() => tileCoordinates(TILE_COLUMNS * TILE_ROWS)).toThrow(RangeError);
  });
});

describe("terrain creation", () => {
  it("normalizes unicode seeds and validates percentage settings", () => {
    expect(normalizeSeed("  e\u0301ldoria  ")).toBe("éldoria");
    expect(normalizeSeed(" \t\n")).toBe("atlas");
    expect(
      normalizeSettings({
        ...DEFAULT_TERRAIN_SETTINGS,
        seed: "  e\u0301ldoria  ",
      }),
    ).toEqual({
      ...DEFAULT_TERRAIN_SETTINGS,
      seed: "éldoria",
    });

    for (const field of [
      "seaLevel",
      "roughness",
      "temperatureTarget",
      "moistureTarget",
    ] as const) {
      expect(() =>
        normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, [field]: Number.NaN }),
      ).toThrow();
      expect(() =>
        normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, [field]: 1.5 }),
      ).toThrow();
      expect(() =>
        normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, [field]: -1 }),
      ).toThrow();
      expect(() =>
        normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, [field]: 101 }),
      ).toThrow();
    }
    expect(() =>
      normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, seaLevel: 100 }),
    ).toThrow();
    expect(() =>
      normalizeSettings({ ...DEFAULT_TERRAIN_SETTINGS, seed: "" }),
    ).not.toThrow();
  });

  it("creates complete blank source fields above the normalized sea threshold", () => {
    const lowSea = createTerrain("blank", {
      ...DEFAULT_TERRAIN_SETTINGS,
      seaLevel: 0,
    });
    const highSea = createTerrain("blank", {
      ...DEFAULT_TERRAIN_SETTINGS,
      seaLevel: 99,
    });
    const sampleCount = MAP_WIDTH * MAP_HEIGHT;

    expect(lowSea.metadata).toEqual({
      version: TERRAIN_VERSION,
      kind: "blank",
      effectiveSeed: "atlas",
      settings: { ...DEFAULT_TERRAIN_SETTINGS, seaLevel: 0 },
      seaLevel: 0,
    });
    expect(highSea.metadata.seaLevel).toBe(64880);
    expect(lowSea.elevation.length).toBe(sampleCount);
    expect(lowSea.temperature.length).toBe(sampleCount);
    expect(lowSea.moisture.length).toBe(sampleCount);
    expect(lowSea.elevation[0]).toBe(49152);
    expect(highSea.elevation[0]).toBe(64881);
    expect(lowSea.elevation.every((value) => value === 49152)).toBe(true);
    expect(highSea.elevation.every((value) => value === 64881)).toBe(true);
    expect(lowSea.temperature.every((value) => value === 128)).toBe(true);
    expect(lowSea.moisture.every((value) => value === 128)).toBe(true);
  });

  it("creates repeatable generated fields with independent climate and roughness effects", () => {
    const settings = { ...DEFAULT_TERRAIN_SETTINGS, seed: "  e\u0301ldoria  " };
    const first = createTerrain("generated", settings);
    const second = createTerrain("generated", settings);
    const changedClimate = createTerrain("generated", {
      ...settings,
      temperatureTarget: 90,
      moistureTarget: 10,
    });
    const changedRoughness = createTerrain("generated", {
      ...settings,
      roughness: 0,
    });
    const changedSea = createTerrain("generated", { ...settings, seaLevel: 0 });

    expect(hashSeed("  e\u0301ldoria  ")).toBe(hashSeed("éldoria"));
    expect(first.metadata.effectiveSeed).toBe("éldoria");
    expect(first.metadata.seaLevel).toBe(32768);
    expect(changedSea.metadata.seaLevel).toBe(0);
    expect(digest(changedSea.elevation)).toBe(digest(first.elevation));
    expect(digest(changedSea.temperature)).toBe(digest(first.temperature));
    expect(digest(changedSea.moisture)).toBe(digest(first.moisture));
    expect(digest(second.elevation)).toBe(digest(first.elevation));
    expect(digest(second.temperature)).toBe(digest(first.temperature));
    expect(digest(second.moisture)).toBe(digest(first.moisture));
    expect(digest(changedClimate.temperature)).not.toBe(
      digest(first.temperature),
    );
    expect(digest(changedClimate.moisture)).not.toBe(digest(first.moisture));
    expect(digest(changedRoughness.elevation)).not.toBe(
      digest(first.elevation),
    );

    const equator = first.temperature[Math.floor(MAP_HEIGHT / 2) * MAP_WIDTH];
    const pole = first.temperature[0];
    expect(equator).toBeGreaterThan(pole);
    expect(first.elevation[0]).toBe(33948);
    expect(first.temperature[0]).toBe(54);
    expect(first.moisture[0]).toBe(144);
  }, 20_000);

  it("keeps neighboring samples finite across the horizontal seam and vertical edges", () => {
    const source = createTerrain("generated", DEFAULT_TERRAIN_SETTINGS);
    const seamDistance = Math.abs(
      source.elevation[MAP_WIDTH - 1] - source.elevation[0],
    );
    const interiorDistance = Math.abs(
      source.elevation[100] - source.elevation[101],
    );
    expect(seamDistance).toBeLessThan(256);
    expect(seamDistance).toBeGreaterThan(0);
    expect(interiorDistance).toBeGreaterThan(0);
    expect(source.elevation[0]).toBeGreaterThanOrEqual(0);
    expect(
      source.elevation[MAP_WIDTH * (MAP_HEIGHT - 1)],
    ).toBeGreaterThanOrEqual(0);
  });
});
