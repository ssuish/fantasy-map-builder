import type { DerivedTile } from "./derivation";
import type { TerrainKind, TerrainSettings, TerrainSource } from "./types";

export interface TerrainCandidate {
  source: TerrainSource;
  tiles: DerivedTile[];
  contours: boolean;
}

export type WorkerRequest =
  | {
      id: number;
      command: "create";
      kind: TerrainKind;
      settings: TerrainSettings;
      contours: boolean;
    }
  | {
      id: number;
      command: "derive";
      source: TerrainSource;
      indices?: readonly number[];
      contours: boolean;
    };

export type WorkerResponse =
  | {
      id: number;
      command: "create";
      ok: true;
      result: TerrainCandidate;
    }
  | {
      id: number;
      command: "derive";
      ok: true;
      result: DerivedTile[];
    }
  | { id: number; command: WorkerRequest["command"]; ok: false; error: string };

export interface TerrainBackend {
  create(
    kind: TerrainKind,
    settings: TerrainSettings,
    contours: boolean,
  ): Promise<TerrainCandidate>;
  derive(
    source: TerrainSource,
    indices: readonly number[] | undefined,
    contours: boolean,
  ): Promise<DerivedTile[]>;
  dispose(): void;
}
