import { describe, expect, it } from "vitest";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  TERRAIN_VERSION,
  type TerrainSource,
} from "../src/terrain/types";
import { affectedTileIndices, deriveTiles } from "../src/terrain/derivation";

const SAMPLE_COUNT = MAP_WIDTH * MAP_HEIGHT;

function sourceWith(
  elevation = 50_000,
  temperature = 128,
  moisture = 128,
): TerrainSource {
  return {
    metadata: {
      version: TERRAIN_VERSION,
      kind: "blank",
      effectiveSeed: "test",
      settings: {
        seed: "test",
        seaLevel: 50,
        roughness: 50,
        temperatureTarget: 50,
        moistureTarget: 50,
      },
      seaLevel: 32_768,
    },
    elevation: new Uint16Array(SAMPLE_COUNT).fill(elevation),
    temperature: new Uint8Array(SAMPLE_COUNT).fill(temperature),
    moisture: new Uint8Array(SAMPLE_COUNT).fill(moisture),
  };
}

function pixel(tile: { rgba: Uint8Array }, x: number, y: number): number[] {
  const offset = (y * (TILE_SIZE + 2) + x) * 4;
  return [...tile.rgba.slice(offset, offset + 4)];
}

function alphaValues(values: Uint8Array): number[] {
  const alpha = [];
  for (let index = 3; index < values.length; index += 4) {
    alpha.push(values[index]);
  }
  return alpha;
}

function digest(values: ArrayLike<number>): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < values.length; index += 1) {
    hash = Math.imul(hash ^ values[index], 0x01000193) >>> 0;
  }
  return hash;
}

function planarSource(slopeX: number, slopeY: number): TerrainSource {
  const source = sourceWith();
  source.metadata.seaLevel = 1_000;
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const value = 32_768 + slopeX * (x - 128) + slopeY * (y - 128);
      source.elevation[y * MAP_WIDTH + x] = Math.min(
        65_535,
        Math.max(0, value),
      );
    }
  }
  return source;
}

describe("terrain derivation", () => {
  it("derives literal palette colors for flat land and water depths", () => {
    const land = deriveTiles(sourceWith(50_000), [0])[0];
    const shallow = deriveTiles(sourceWith(32_000), [0])[0];
    const medium = deriveTiles(sourceWith(20_000), [0])[0];
    const deep = deriveTiles(sourceWith(1_000), [0])[0];

    expect(pixel(land, 1, 1)).toEqual([92, 148, 76, 255]);
    expect(pixel(shallow, 1, 1)).toEqual([75, 151, 190, 255]);
    expect(pixel(medium, 1, 1)).toEqual([46, 105, 161, 255]);
    expect(pixel(deep, 1, 1)).toEqual([21, 60, 116, 255]);
    expect(
      new Set([
        pixel(shallow, 1, 1).join(),
        pixel(medium, 1, 1).join(),
        pixel(deep, 1, 1).join(),
      ]).size,
    ).toBe(3);
  });

  it("uses climate and elevation for visible land biome changes", () => {
    const grass = deriveTiles(sourceWith(50_000, 128, 128), [0])[0];
    const desert = deriveTiles(sourceWith(50_000, 230, 24), [0])[0];
    const mountain = deriveTiles(sourceWith(60_000, 128, 128), [0])[0];
    const snow = deriveTiles(sourceWith(64_000, 128, 128), [0])[0];

    expect(pixel(grass, 1, 1)).toEqual([92, 148, 76, 255]);
    expect(pixel(desert, 1, 1)).toEqual([194, 166, 92, 255]);
    expect(pixel(mountain, 1, 1)).toEqual([116, 112, 104, 255]);
    expect(pixel(snow, 1, 1)).toEqual([232, 237, 235, 255]);
  });

  it("marks shoreline pixels and applies restrained hill shading", () => {
    const shoreline = sourceWith(50_000);
    shoreline.elevation.fill(30_000);
    shoreline.elevation[0] = 50_000;
    shoreline.elevation[1] = 50_000;
    shoreline.elevation[MAP_WIDTH] = 50_000;
    const shorelineTile = deriveTiles(shoreline, [0])[0];
    expect(pixel(shorelineTile, 1, 1)).toEqual([206, 183, 102, 255]);

    const highCliff = sourceWith(30_000);
    highCliff.elevation[128 * MAP_WIDTH + 128] = 64_000;
    const highCliffTile = deriveTiles(highCliff, [0])[0];
    expect(pixel(highCliffTile, 129, 129)).toEqual([206, 183, 102, 255]);
  });

  it("uses NW directional shading for planar slopes and preserves source", () => {
    const rising = planarSource(512, 0);
    const falling = planarSource(-512, 0);
    const before = [
      digest(rising.elevation),
      digest(rising.temperature),
      digest(rising.moisture),
    ];

    const risingTile = deriveTiles(rising, [0])[0];
    const fallingTile = deriveTiles(falling, [0])[0];

    expect(pixel(risingTile, 129, 129)).toEqual([91, 146, 75, 255]);
    expect(pixel(fallingTile, 129, 129)).toEqual([93, 150, 77, 255]);
    expect([
      digest(rising.elevation),
      digest(rising.temperature),
      digest(rising.moisture),
    ]).toEqual(before);
  });

  it("fills gutters from the same wrapped or clamped samples as adjacent interiors", () => {
    const source = sourceWith();
    const tiles = deriveTiles(source, [0, 1, 7, 8], true);
    const byIndex = new Map(tiles.map((tile) => [tile.index, tile]));
    const first = byIndex.get(0)!;
    const second = byIndex.get(1)!;
    const lastColumn = byIndex.get(7)!;
    const firstBottom = byIndex.get(8)!;

    expect(pixel(first, TILE_SIZE + 1, 1)).toEqual(pixel(second, 1, 1));
    expect(pixel(lastColumn, TILE_SIZE + 1, 1)).toEqual(pixel(first, 1, 1));
    expect(pixel(first, 1, TILE_SIZE + 1)).toEqual(pixel(firstBottom, 1, 1));
    expect(pixel(firstBottom, 1, TILE_SIZE + 1)).toEqual(
      pixel(firstBottom, 1, TILE_SIZE),
    );

    const contourFirst = byIndex.get(0)!.contours!;
    const contourSecond = byIndex.get(1)!.contours!;
    expect(
      contourFirst.slice(
        (1 * (TILE_SIZE + 2) + TILE_SIZE + 1) * 4,
        (1 * (TILE_SIZE + 2) + TILE_SIZE + 2) * 4,
      ),
    ).toEqual(
      contourSecond.slice(
        (1 * (TILE_SIZE + 2) + 1) * 4,
        (1 * (TILE_SIZE + 2) + 2) * 4,
      ),
    );
  });

  it("derives only unique sorted selected tiles and preserves source fields", () => {
    const source = sourceWith();
    const before = {
      elevation: source.elevation.slice(),
      temperature: source.temperature.slice(),
      moisture: source.moisture.slice(),
    };
    const tiles = deriveTiles(source, [3, 1, 3, 1], false);

    expect(tiles.map(({ index }) => index)).toEqual([1, 3]);
    expect(
      tiles.every(
        ({ width, height, rgba, contours }) =>
          width === 258 &&
          height === 258 &&
          rgba.length === 258 * 258 * 4 &&
          contours === undefined,
      ),
    ).toBe(true);
    expect(source.elevation[0]).toBe(before.elevation[0]);
    expect(source.elevation[MAP_WIDTH + 1]).toBe(
      before.elevation[MAP_WIDTH + 1],
    );
    expect(source.temperature[0]).toBe(before.temperature[0]);
    expect(source.moisture[MAP_WIDTH + 1]).toBe(before.moisture[MAP_WIDTH + 1]);
  });

  it("toggles transparent quantized-elevation contours", () => {
    const source = sourceWith(50_000);
    source.elevation[1] = 54_096;
    const without = deriveTiles(source, [0], false)[0];
    const withContours = deriveTiles(source, [0], true)[0];

    expect(without.contours).toBeUndefined();
    expect(withContours.contours).toBeInstanceOf(Uint8Array);
    expect(withContours.contours!.length).toBe(258 * 258 * 4);
    expect(alphaValues(withContours.contours!)).toContain(180);
    expect(
      alphaValues(withContours.contours!).some((value) => value === 0),
    ).toBe(true);
  });

  it("returns expanded dirty neighborhoods across tile, seam, and corner boundaries", () => {
    expect(
      affectedTileIndices({ x: 256, y: 256, width: 1, height: 1 }),
    ).toEqual([0, 1, 8, 9]);
    expect(
      affectedTileIndices({ x: MAP_WIDTH - 1, y: 255, width: 1, height: 1 }),
    ).toEqual([0, 7, 8, 15]);
    expect(affectedTileIndices({ x: 0, y: 0, width: 1, height: 1 })).toEqual([
      0, 7,
    ]);
    expect(affectedTileIndices({ x: 10, y: 10, width: 0, height: 10 })).toEqual(
      [],
    );
    expect(affectedTileIndices({ x: 10, y: 10, width: 10, height: 0 })).toEqual(
      [],
    );
  });

  it("rejects malformed sources, indices, and bounds before deriving", () => {
    const source = sourceWith();
    expect(() =>
      deriveTiles({ ...source, elevation: new Uint16Array(1) }),
    ).toThrow(/elevation/);
    expect(() =>
      deriveTiles({ ...source, temperature: new Uint8Array(1) }),
    ).toThrow(/temperature/);
    expect(() => deriveTiles(source, [TILE_COLUMNS * TILE_ROWS])).toThrow(
      RangeError,
    );
    expect(() => deriveTiles(source, [1.5])).toThrow(RangeError);
    expect(() =>
      affectedTileIndices({ x: 0, y: 0, width: Number.NaN, height: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      affectedTileIndices({ x: 0, y: 0, width: -1, height: 1 }),
    ).toThrow(RangeError);
  });
});
