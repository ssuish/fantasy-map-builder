import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TERRAIN_VERSION,
  TILE_COLUMNS,
  TILE_ROWS,
  TILE_SIZE,
  type TerrainSource,
} from "./types";

const UINT16_MAX = 0xffff;
const SAMPLE_COUNT = MAP_WIDTH * MAP_HEIGHT;
const TEXTURE_SIZE = TILE_SIZE + 2;
const TEXTURE_LENGTH = TEXTURE_SIZE * TEXTURE_SIZE * 4;
const DIRTY_RADIUS = 2;
const CONTOUR_ALPHA = 180;

const SHALLOW_WATER: readonly [number, number, number] = [75, 151, 190];
const MEDIUM_WATER: readonly [number, number, number] = [46, 105, 161];
const DEEP_WATER: readonly [number, number, number] = [21, 60, 116];
const SHORELINE: readonly [number, number, number] = [206, 183, 102];
const GRASS: readonly [number, number, number] = [92, 148, 76];
const DESERT: readonly [number, number, number] = [194, 166, 92];
const TUNDRA: readonly [number, number, number] = [133, 151, 142];
const FOREST: readonly [number, number, number] = [65, 126, 76];
const JUNGLE: readonly [number, number, number] = [54, 132, 83];
const DRY_GRASS: readonly [number, number, number] = [158, 153, 76];
const MOUNTAIN: readonly [number, number, number] = [116, 112, 104];
const SNOW: readonly [number, number, number] = [232, 237, 235];
const CONTOUR_COLOR: readonly [number, number, number] = [50, 47, 41];

export interface DerivedTile {
  index: number;
  column: number;
  row: number;
  width: number;
  height: number;
  rgba: Uint8Array;
  contours?: Uint8Array;
}

export function deriveTiles(
  source: TerrainSource,
  indices?: readonly number[],
  includeContours = false,
): DerivedTile[] {
  validateSource(source);
  if (typeof includeContours !== "boolean") {
    throw new TypeError("includeContours must be a boolean.");
  }

  const tileIndices = normalizeTileIndices(indices);
  const tiles = new Array<DerivedTile>(tileIndices.length);
  for (let tileNumber = 0; tileNumber < tileIndices.length; tileNumber += 1) {
    tiles[tileNumber] = deriveTile(
      source,
      tileIndices[tileNumber],
      includeContours,
    );
  }
  return tiles;
}

export function affectedTileIndices(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): number[] {
  validateBounds(bounds);
  if (bounds.width === 0 || bounds.height === 0) {
    return [];
  }

  const endX = checkedCeil(bounds.x + bounds.width) - 1 + DIRTY_RADIUS;
  const startX = Math.floor(bounds.x) - DIRTY_RADIUS;
  const endY = checkedCeil(bounds.y + bounds.height) - 1 + DIRTY_RADIUS;
  const startY = Math.floor(bounds.y) - DIRTY_RADIUS;
  const columns = new Set<number>();
  const rows = new Set<number>();

  const sampleWidth = endX - startX + 1;
  if (sampleWidth >= MAP_WIDTH) {
    for (let column = 0; column < TILE_COLUMNS; column += 1) {
      columns.add(column);
    }
  } else {
    for (let offset = 0; offset < sampleWidth; offset += 1) {
      columns.add(
        Math.floor(wrapCoordinate(startX + offset, MAP_WIDTH) / TILE_SIZE),
      );
    }
  }

  const firstRow = Math.max(0, startY);
  const lastRow = Math.min(MAP_HEIGHT - 1, endY);
  for (let y = firstRow; y <= lastRow; y += 1) {
    rows.add(Math.floor(y / TILE_SIZE));
  }

  const indices = new Set<number>();
  for (const row of rows) {
    for (const column of columns) {
      indices.add(row * TILE_COLUMNS + column);
    }
  }
  return [...indices].sort((first, second) => first - second);
}

function deriveTile(
  source: TerrainSource,
  index: number,
  includeContours: boolean,
): DerivedTile {
  const column = index % TILE_COLUMNS;
  const row = Math.floor(index / TILE_COLUMNS);
  const rgba = new Uint8Array(TEXTURE_LENGTH);
  const contours = includeContours ? new Uint8Array(TEXTURE_LENGTH) : undefined;

  for (let outputY = 0; outputY < TEXTURE_SIZE; outputY += 1) {
    const worldY = row * TILE_SIZE + outputY - 1;
    for (let outputX = 0; outputX < TEXTURE_SIZE; outputX += 1) {
      const worldX = column * TILE_SIZE + outputX - 1;
      const sample = sampleAt(source, worldX, worldY);
      const offset = (outputY * TEXTURE_SIZE + outputX) * 4;
      const color = deriveColor(source, worldX, worldY, sample);
      rgba[offset] = color[0];
      rgba[offset + 1] = color[1];
      rgba[offset + 2] = color[2];
      rgba[offset + 3] = 255;

      if (
        contours !== undefined &&
        hasContour(source, worldX, worldY, sample)
      ) {
        contours[offset] = CONTOUR_COLOR[0];
        contours[offset + 1] = CONTOUR_COLOR[1];
        contours[offset + 2] = CONTOUR_COLOR[2];
        contours[offset + 3] = CONTOUR_ALPHA;
      }
    }
  }

  return {
    index,
    column,
    row,
    width: TEXTURE_SIZE,
    height: TEXTURE_SIZE,
    rgba,
    ...(contours === undefined ? {} : { contours }),
  };
}

function deriveColor(
  source: TerrainSource,
  x: number,
  y: number,
  sample: Sample,
): readonly [number, number, number] {
  const { elevation, temperature, moisture } = sample;
  const seaLevel = source.metadata.seaLevel;
  const land = elevation >= seaLevel;
  const neighbors = cardinalElevations(source, x, y);
  const coastal = land && neighbors.some((neighbor) => neighbor < seaLevel);
  let base: readonly [number, number, number];

  if (!land) {
    const depth = seaLevel - elevation;
    const threshold = seaLevel + 1;
    base =
      depth * 4 <= threshold
        ? SHALLOW_WATER
        : depth * 2 <= threshold
          ? MEDIUM_WATER
          : DEEP_WATER;
  } else if (coastal) {
    base = SHORELINE;
  } else if (elevation >= 62_000) {
    base = SNOW;
  } else if (elevation >= 56_000) {
    base = MOUNTAIN;
  } else if (temperature >= 190 && moisture < 90) {
    base = DESERT;
  } else if (temperature < 64 && moisture < 140) {
    base = TUNDRA;
  } else if (temperature >= 170 && moisture >= 170) {
    base = JUNGLE;
  } else if (moisture >= 170) {
    base = FOREST;
  } else if (moisture < 64) {
    base = DRY_GRASS;
  } else {
    base = GRASS;
  }

  if (coastal) {
    return base;
  }
  const directionalGradient =
    neighbors[0] - neighbors[1] + neighbors[2] - neighbors[3];
  const shade = clamp(roundSignedDiv(directionalGradient, 256), -12, 12);
  return [
    shadeChannel(base[0], shade),
    shadeChannel(base[1], shade),
    shadeChannel(base[2], shade),
  ];
}

function hasContour(
  source: TerrainSource,
  x: number,
  y: number,
  sample: Sample,
): boolean {
  const level = sample.elevation >> 12;
  const neighbors = cardinalElevations(source, x, y);
  return neighbors.some((elevation) => elevation >> 12 !== level);
}

interface Sample {
  elevation: number;
  temperature: number;
  moisture: number;
}

function sampleAt(source: TerrainSource, x: number, y: number): Sample {
  const index = sampleIndex(x, y);
  return {
    elevation: source.elevation[index],
    temperature: source.temperature[index],
    moisture: source.moisture[index],
  };
}

function cardinalElevations(
  source: TerrainSource,
  x: number,
  y: number,
): [number, number, number, number] {
  return [
    source.elevation[sampleIndex(x - 1, y)],
    source.elevation[sampleIndex(x + 1, y)],
    source.elevation[sampleIndex(x, y - 1)],
    source.elevation[sampleIndex(x, y + 1)],
  ];
}

function sampleIndex(x: number, y: number): number {
  return (
    clampCoordinate(y, MAP_HEIGHT) * MAP_WIDTH + wrapCoordinate(x, MAP_WIDTH)
  );
}

function normalizeTileIndices(
  indices: readonly number[] | undefined,
): number[] {
  if (indices === undefined) {
    return Array.from(
      { length: TILE_COLUMNS * TILE_ROWS },
      (_, index) => index,
    );
  }
  if (!Array.isArray(indices)) {
    throw new TypeError("indices must be an array.");
  }
  const unique = new Set<number>();
  for (const index of indices) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= TILE_COLUMNS * TILE_ROWS
    ) {
      throw new RangeError("index must identify a tile in the map.");
    }
    unique.add(index);
  }
  return [...unique].sort((first, second) => first - second);
}

function validateSource(source: TerrainSource): void {
  if (source === null || typeof source !== "object") {
    throw new TypeError("source must be an object.");
  }
  if (!(source.elevation instanceof Uint16Array)) {
    throw new TypeError("elevation must be a Uint16Array.");
  }
  if (source.elevation.length !== SAMPLE_COUNT) {
    throw new RangeError("elevation must contain one sample per map location.");
  }
  if (!(source.temperature instanceof Uint8Array)) {
    throw new TypeError("temperature must be a Uint8Array.");
  }
  if (source.temperature.length !== SAMPLE_COUNT) {
    throw new RangeError(
      "temperature must contain one sample per map location.",
    );
  }
  if (!(source.moisture instanceof Uint8Array)) {
    throw new TypeError("moisture must be a Uint8Array.");
  }
  if (source.moisture.length !== SAMPLE_COUNT) {
    throw new RangeError("moisture must contain one sample per map location.");
  }
  if (
    source.metadata === null ||
    typeof source.metadata !== "object" ||
    source.metadata.version !== TERRAIN_VERSION
  ) {
    throw new TypeError("source metadata must use terrain-v1.");
  }
  if (
    !Number.isInteger(source.metadata.seaLevel) ||
    source.metadata.seaLevel < 0 ||
    source.metadata.seaLevel > UINT16_MAX
  ) {
    throw new RangeError("source metadata seaLevel must be a Uint16 value.");
  }
}

function validateBounds(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): void {
  if (bounds === null || typeof bounds !== "object") {
    throw new TypeError("bounds must be an object.");
  }
  for (const [name, value] of Object.entries(bounds)) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite.`);
    }
  }
  if (bounds.width < 0 || bounds.height < 0) {
    throw new RangeError("bounds width and height must be nonnegative.");
  }
  checkedCeil(bounds.x + bounds.width);
  checkedCeil(bounds.y + bounds.height);
}

function checkedCeil(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError("bounds extent must be finite.");
  }
  return Math.ceil(value);
}

function wrapCoordinate(value: number, length: number): number {
  return ((value % length) + length) % length;
}

function clampCoordinate(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}

function roundSignedDiv(value: number, divisor: number): number {
  return value >= 0
    ? Math.floor((value + Math.floor(divisor / 2)) / divisor)
    : Math.ceil((value - Math.floor(divisor / 2)) / divisor);
}

function shadeChannel(value: number, shade: number): number {
  return clamp(Math.floor((value * (256 + shade) + 128) / 256), 0, 255);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
