import { expect, it, vi } from "vitest";
import { WorkerTerrainBackend } from "../src/terrain/worker-client";
import { createTerrain } from "../src/terrain/generation";
import { DEFAULT_TERRAIN_SETTINGS } from "../src/terrain/types";
import { BrowserWorker } from "./helpers/browser-worker";

it("creates a candidate through the browser Worker boundary", async () => {
  const worker = new BrowserWorker();
  const backend = new WorkerTerrainBackend(() => worker);
  const pending = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
  const request = worker.requests[0];
  expect(request.command).toBe("create");
  const source = createTerrain("blank", DEFAULT_TERRAIN_SETTINGS);
  worker.reply({
    id: request.id,
    command: "create",
    ok: true,
    result: { source, tiles: [], contours: false },
  });
  const candidate = await pending;
  expect(candidate.source.elevation[0]).toBe(49152);
  expect(candidate.source.metadata.effectiveSeed).toBe("atlas");
  backend.dispose();
  expect(worker.terminated).toBe(true);
});

it("rejects a failed creation and retries without changing settings", async () => {
  const worker = new BrowserWorker();
  const backend = new WorkerTerrainBackend(() => worker);
  const failed = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
  const rejection = expect(failed).rejects.toThrow("Allocation failed");
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: false,
    error: "Allocation failed",
  });
  await rejection;
  const retried = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
  worker.reply({
    id: worker.requests[1].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  expect((await retried).source.metadata.settings).toEqual(
    DEFAULT_TERRAIN_SETTINGS,
  );
  backend.dispose();
}, 1000);

it("derives requested tiles without transferring authoritative source buffers away", async () => {
  const worker = new BrowserWorker();
  const backend = new WorkerTerrainBackend(() => worker);
  const source = createTerrain("blank", DEFAULT_TERRAIN_SETTINGS);
  const pending = backend.derive(source, [0, 7], true);
  const request = worker.requests[0];
  expect(request.command).toBe("derive");
  if (request.command !== "derive") throw new Error("Wrong Worker command");
  expect(request.indices).toEqual([0, 7]);
  expect(request.contours).toBe(true);
  expect(request.source.elevation[0]).toBe(49152);
  expect(source.elevation.byteLength).toBe(4_194_304);
  worker.reply({ id: request.id, command: "derive", ok: true, result: [] });
  expect(await pending).toEqual([]);
  backend.dispose();
});

it("times out unresponsive work and rejects work after disposal", async () => {
  vi.useFakeTimers();
  try {
    const worker = new BrowserWorker();
    const backend = new WorkerTerrainBackend(() => worker, 100);
    const waiting = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
    const rejection = expect(waiting).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(worker.terminated).toBe(true);
    backend.dispose();
    await expect(
      backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false),
    ).rejects.toThrow("disposed");
  } finally {
    vi.useRealTimers();
  }
}, 1000);

it("rejects crashed Worker work and uses a fresh Worker for retry", async () => {
  const first = new BrowserWorker();
  const second = new BrowserWorker();
  const workers = [first, second];
  const backend = new WorkerTerrainBackend(() => workers.shift()!);
  const failed = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
  const rejection = expect(failed).rejects.toThrow("Worker stopped");
  first.dispatchEvent(new Event("error"));
  await rejection;
  expect(first.terminated).toBe(true);
  const retry = backend.create("blank", DEFAULT_TERRAIN_SETTINGS, false);
  second.reply({
    id: second.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  expect((await retry).source.metadata.kind).toBe("blank");
  backend.dispose();
}, 1000);
