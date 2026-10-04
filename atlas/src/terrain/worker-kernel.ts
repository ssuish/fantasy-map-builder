import { createTerrain } from "./generation";
import { deriveTiles } from "./derivation";
import type { WorkerRequest, WorkerResponse } from "./protocol";

export function executeTerrainJob(request: WorkerRequest): WorkerResponse {
  try {
    if (request.command === "create") {
      const source = createTerrain(request.kind, request.settings);
      const tiles = deriveTiles(source, undefined, request.contours);
      return {
        id: request.id,
        command: "create",
        ok: true,
        result: { source, tiles, contours: request.contours },
      };
    }
    if (request.command === "derive") {
      return {
        id: request.id,
        command: "derive",
        ok: true,
        result: deriveTiles(request.source, request.indices, request.contours),
      };
    }
    throw new Error("Unknown terrain Worker command.");
  } catch (error) {
    return {
      id: request.id,
      command: request.command,
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Terrain creation failed. Retry using the same settings.",
    };
  }
}

export function resultTransfers(response: WorkerResponse): Transferable[] {
  if (!response.ok) return [];
  const buffers = new Set<ArrayBuffer>();
  const tiles =
    response.command === "create" ? response.result.tiles : response.result;
  if (response.command === "create") {
    const source = response.result.source;
    buffers.add(source.elevation.buffer as ArrayBuffer);
    buffers.add(source.temperature.buffer as ArrayBuffer);
    buffers.add(source.moisture.buffer as ArrayBuffer);
  }
  for (const tile of tiles) {
    buffers.add(tile.rgba.buffer as ArrayBuffer);
    if (tile.contours) buffers.add(tile.contours.buffer as ArrayBuffer);
  }
  return [...buffers];
}
