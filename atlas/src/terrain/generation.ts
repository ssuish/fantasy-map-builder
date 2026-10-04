import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TERRAIN_VERSION,
  type TerrainKind,
  type TerrainSettings,
  type TerrainSource,
} from "./types";

const UINT16_MAX = 0xffff;
const SAMPLE_COUNT = MAP_WIDTH * MAP_HEIGHT;
const FIXED_ONE = 1 << 16;
const OCTAVE_COUNT = 6;
const BASE_LATTICE_WIDTH = 8;
const BASE_LATTICE_HEIGHT = 4;
const TEMPERATURE_PULL = 39322;
const MOISTURE_PULL = 36045;

export function normalizeSeed(seed: string): string {
  if (typeof seed !== "string") {
    throw new TypeError("seed must be a string.");
  }
  const normalized = seed.normalize("NFC").trim();
  return normalized.length > 0 ? normalized : "atlas";
}

export function normalizeSettings(settings: TerrainSettings): TerrainSettings {
  if (settings === null || typeof settings !== "object") {
    throw new TypeError("terrain settings must be an object.");
  }

  const normalized: TerrainSettings = {
    seed: normalizeSeed(settings.seed),
    seaLevel: settings.seaLevel,
    roughness: settings.roughness,
    temperatureTarget: settings.temperatureTarget,
    moistureTarget: settings.moistureTarget,
  };
  validatePercentage(normalized.seaLevel, "seaLevel", 99);
  validatePercentage(normalized.roughness, "roughness", 100);
  validatePercentage(normalized.temperatureTarget, "temperatureTarget", 100);
  validatePercentage(normalized.moistureTarget, "moistureTarget", 100);
  return normalized;
}

export function hashSeed(seed: string): number {
  const bytes = new TextEncoder().encode(
    `${TERRAIN_VERSION}\u0000${normalizeSeed(seed)}`,
  );
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash = Math.imul(hash ^ byte, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function createTerrain(
  kind: TerrainKind,
  settings: TerrainSettings,
): TerrainSource {
  if (kind !== "blank" && kind !== "generated") {
    throw new TypeError("terrain kind must be blank or generated.");
  }
  const normalizedSettings = normalizeSettings(settings);
  const seaLevel = percentageToUint16(normalizedSettings.seaLevel);
  const metadata = {
    version: TERRAIN_VERSION,
    kind,
    effectiveSeed: normalizedSettings.seed,
    settings: normalizedSettings,
    seaLevel,
  };

  if (kind === "blank") {
    const elevationValue = Math.max(49152, seaLevel + 1);
    return {
      metadata,
      elevation: new Uint16Array(SAMPLE_COUNT).fill(elevationValue),
      temperature: new Uint8Array(SAMPLE_COUNT).fill(128),
      moisture: new Uint8Array(SAMPLE_COUNT).fill(128),
    };
  }

  return generateTerrain(metadata, normalizedSettings);
}

function validatePercentage(
  value: number,
  name: string,
  maximum: number,
): void {
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new RangeError(
      `${name} must be an integer percentage from 0 to ${maximum}.`,
    );
  }
}

function percentageToUint16(value: number): number {
  return Math.round((value * UINT16_MAX) / 100);
}

interface NoiseGrid {
  width: number;
  values: Uint16Array;
}

interface AxisLookup {
  cell: Uint16Array;
  next: Uint16Array;
  smooth: Uint32Array;
}

function generateTerrain(
  metadata: TerrainSource["metadata"],
  settings: TerrainSettings,
): TerrainSource {
  const seedHash = hashSeed(settings.seed);
  const persistence = 32768 + Math.floor((settings.roughness * 22938) / 100);
  const xLookups = new Array<AxisLookup>(OCTAVE_COUNT);
  const yLookups = new Array<AxisLookup>(OCTAVE_COUNT);
  const elevationGrids = createNoiseGrids(seedHash, 0);
  const temperatureGrids = createNoiseGrids(seedHash, 1);
  const moistureGrids = createNoiseGrids(seedHash, 2);

  for (let octave = 0; octave < OCTAVE_COUNT; octave += 1) {
    const latticeWidth = BASE_LATTICE_WIDTH << octave;
    const latticeHeight = BASE_LATTICE_HEIGHT << octave;
    xLookups[octave] = createAxisLookup(MAP_WIDTH, latticeWidth, true);
    yLookups[octave] = createAxisLookup(MAP_HEIGHT, latticeHeight, false);
  }

  const elevation = new Uint16Array(SAMPLE_COUNT);
  const temperature = new Uint8Array(SAMPLE_COUNT);
  const moisture = new Uint8Array(SAMPLE_COUNT);
  const temperatureTarget = percentageToUint16(settings.temperatureTarget);
  const moistureTarget = percentageToUint16(settings.moistureTarget);

  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    const latitude = latitudeValue(y);
    const temperatureBase = Math.floor(
      (latitude * 3 + temperatureTarget * 2) / 5,
    );
    const moistureBase = moistureTarget;
    const rowStart = y * MAP_WIDTH;
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const index = rowStart + x;
      const elevationValue = weightedNoise(
        elevationGrids,
        xLookups,
        yLookups,
        x,
        y,
        persistence,
      );
      const temperatureValue = blend(
        weightedNoise(temperatureGrids, xLookups, yLookups, x, y, persistence),
        temperatureBase,
        TEMPERATURE_PULL,
      );
      const moistureValue = blend(
        weightedNoise(moistureGrids, xLookups, yLookups, x, y, persistence),
        moistureBase,
        MOISTURE_PULL,
      );
      elevation[index] = elevationValue;
      temperature[index] = toUint8(temperatureValue);
      moisture[index] = toUint8(moistureValue);
    }
  }

  return { metadata, elevation, temperature, moisture };
}

function createNoiseGrids(seedHash: number, channel: number): NoiseGrid[] {
  const grids = new Array<NoiseGrid>(OCTAVE_COUNT);
  for (let octave = 0; octave < OCTAVE_COUNT; octave += 1) {
    const width = BASE_LATTICE_WIDTH << octave;
    const height = BASE_LATTICE_HEIGHT << octave;
    const values = new Uint16Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        values[y * width + x] = latticeValue(seedHash, channel, octave, x, y);
      }
    }
    grids[octave] = { width, values };
  }
  return grids;
}

function latticeValue(
  seedHash: number,
  channel: number,
  octave: number,
  x: number,
  y: number,
): number {
  let value = seedHash ^ Math.imul(channel + 1, 0x27d4eb2d);
  value = Math.imul(value ^ Math.imul(octave + 1, 0x9e3779b1), 0x85ebca6b);
  value = Math.imul(value ^ Math.imul(x + 1, 0xc2b2ae35), 0x27d4eb2d);
  value = Math.imul(value ^ Math.imul(y + 1, 0x165667b1), 0x85ebca6b);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 16) & UINT16_MAX;
}

function createAxisLookup(
  length: number,
  cells: number,
  wraps: boolean,
): AxisLookup {
  const cell = new Uint16Array(length);
  const next = new Uint16Array(length);
  const smooth = new Uint32Array(length);
  const cellSize = length / cells;
  for (let coordinate = 0; coordinate < length; coordinate += 1) {
    const cellIndex = Math.min(cells - 1, Math.floor(coordinate / cellSize));
    const fraction = Math.floor(
      ((coordinate - cellIndex * cellSize) * FIXED_ONE) / cellSize,
    );
    cell[coordinate] = cellIndex;
    next[coordinate] = wraps
      ? (cellIndex + 1) % cells
      : Math.min(cells - 1, cellIndex + 1);
    smooth[coordinate] = smoothStep(fraction);
  }
  return { cell, next, smooth };
}

function weightedNoise(
  grids: NoiseGrid[],
  xLookups: AxisLookup[],
  yLookups: AxisLookup[],
  x: number,
  y: number,
  persistence: number,
): number {
  let amplitude = FIXED_ONE;
  let totalAmplitude = 0;
  let weighted = 0;
  for (let octave = 0; octave < OCTAVE_COUNT; octave += 1) {
    const grid = grids[octave];
    const xLookup = xLookups[octave];
    const yLookup = yLookups[octave];
    const topLeft = grid.values[yLookup.cell[y] * grid.width + xLookup.cell[x]];
    const topRight =
      grid.values[yLookup.cell[y] * grid.width + xLookup.next[x]];
    const bottomLeft =
      grid.values[yLookup.next[y] * grid.width + xLookup.cell[x]];
    const bottomRight =
      grid.values[yLookup.next[y] * grid.width + xLookup.next[x]];
    const top = interpolate(topLeft, topRight, xLookup.smooth[x]);
    const bottom = interpolate(bottomLeft, bottomRight, xLookup.smooth[x]);
    const value = interpolate(top, bottom, yLookup.smooth[y]);
    weighted += value * amplitude;
    totalAmplitude += amplitude;
    amplitude = Math.max(1, Math.floor((amplitude * persistence) / FIXED_ONE));
  }
  return Math.floor(weighted / totalAmplitude);
}

function smoothStep(value: number): number {
  return Math.floor(
    (value * value * (3 * FIXED_ONE - 2 * value)) / (FIXED_ONE * FIXED_ONE),
  );
}

function interpolate(first: number, second: number, amount: number): number {
  return first + Math.floor(((second - first) * amount) / FIXED_ONE);
}

function blend(first: number, second: number, secondWeight: number): number {
  return Math.floor(
    (first * (FIXED_ONE - secondWeight) + second * secondWeight) / FIXED_ONE,
  );
}

function latitudeValue(y: number): number {
  const distance = Math.abs(2 * y - (MAP_HEIGHT - 1));
  return Math.floor(
    ((MAP_HEIGHT - 1 - distance) * UINT16_MAX) / (MAP_HEIGHT - 1),
  );
}

function toUint8(value: number): number {
  return Math.round((value * 255) / UINT16_MAX);
}
