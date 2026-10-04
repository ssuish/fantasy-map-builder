export const MAP_WIDTH = 2048;
export const MAP_HEIGHT = 1024;
export const TILE_SIZE = 256;
export const TILE_COLUMNS = MAP_WIDTH / TILE_SIZE;
export const TILE_ROWS = MAP_HEIGHT / TILE_SIZE;
export const TERRAIN_VERSION = "terrain-v1";

export type TerrainKind = "blank" | "generated";

export interface TerrainSettings {
  seed: string;
  seaLevel: number;
  roughness: number;
  temperatureTarget: number;
  moistureTarget: number;
}

export const DEFAULT_TERRAIN_SETTINGS: TerrainSettings = {
  seed: "atlas",
  seaLevel: 50,
  roughness: 50,
  temperatureTarget: 50,
  moistureTarget: 50,
};

export interface TerrainMetadata {
  version: string;
  kind: TerrainKind;
  effectiveSeed: string;
  settings: TerrainSettings;
  seaLevel: number;
}

export interface TerrainSource {
  metadata: TerrainMetadata;
  elevation: Uint16Array;
  temperature: Uint8Array;
  moisture: Uint8Array;
}
