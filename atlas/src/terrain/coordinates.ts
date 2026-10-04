import { MAP_HEIGHT, MAP_WIDTH, TILE_COLUMNS, TILE_ROWS } from "./types";

function finiteCoordinate(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
  return value;
}

export function wrapX(x: number): number {
  const coordinate = Math.floor(finiteCoordinate(x, "x"));
  return ((coordinate % MAP_WIDTH) + MAP_WIDTH) % MAP_WIDTH;
}

export function clampY(y: number): number {
  const coordinate = Math.floor(finiteCoordinate(y, "y"));
  return Math.min(MAP_HEIGHT - 1, Math.max(0, coordinate));
}

export function sampleIndex(x: number, y: number): number {
  return clampY(y) * MAP_WIDTH + wrapX(x);
}

export function tileIndex(column: number, row: number): number {
  const tileColumn = wrapTileColumn(column);
  const tileRow = clampTileRow(row);
  return tileRow * TILE_COLUMNS + tileColumn;
}

export function tileCoordinates(index: number): {
  column: number;
  row: number;
} {
  finiteCoordinate(index, "index");
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= TILE_COLUMNS * TILE_ROWS
  ) {
    throw new RangeError("index must identify a tile in the map.");
  }
  return {
    column: index % TILE_COLUMNS,
    row: Math.floor(index / TILE_COLUMNS),
  };
}

function wrapTileColumn(column: number): number {
  const coordinate = Math.floor(finiteCoordinate(column, "column"));
  return ((coordinate % TILE_COLUMNS) + TILE_COLUMNS) % TILE_COLUMNS;
}

function clampTileRow(row: number): number {
  const coordinate = Math.floor(finiteCoordinate(row, "row"));
  return Math.min(TILE_ROWS - 1, Math.max(0, coordinate));
}
