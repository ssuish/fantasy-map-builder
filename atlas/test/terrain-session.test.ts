import { expect, it } from "vitest";
import { TerrainEngine } from "../src/terrain/session";
import { WorkerTerrainBackend } from "../src/terrain/worker-client";
import { createTerrain } from "../src/terrain/generation";
import { DEFAULT_TERRAIN_SETTINGS } from "../src/terrain/types";
import { BrowserWorker } from "./helpers/browser-worker";

it("commits complete candidate presentation and preserves session after Worker failure", async () => {
  const worker = new BrowserWorker();
  const engine = new TerrainEngine(new WorkerTerrainBackend(() => worker));
  let presentedSeed: string | null = null;
  const initial = engine.replace(
    "blank",
    DEFAULT_TERRAIN_SETTINGS,
    false,
    async (view) => ({
      commit: async () => {
        presentedSeed = view.metadata.effectiveSeed;
      },
      rollback: () => {
        presentedSeed = null;
      },
      finish: () => {},
    }),
  );
  expect(engine.current).toBeNull();
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  await initial;
  expect(engine.current?.metadata.effectiveSeed).toBe("atlas");
  expect(presentedSeed).toBe("atlas");
  const failed = engine.replace(
    "blank",
    { ...DEFAULT_TERRAIN_SETTINGS, seed: "replacement" },
    false,
    async () => {
      throw new Error("No candidate should reach presentation");
    },
  );
  const rejection = expect(failed).rejects.toThrow("Allocation failed");
  worker.reply({
    id: worker.requests[1].id,
    command: "create",
    ok: false,
    error: "Allocation failed",
  });
  await rejection;
  expect(engine.current?.metadata.effectiveSeed).toBe("atlas");
  expect(presentedSeed).toBe("atlas");
  engine.dispose();
});

it("cancels pending replacement without losing the current session", async () => {
  const worker = new BrowserWorker();
  const engine = new TerrainEngine(new WorkerTerrainBackend(() => worker));
  const stage = async () => ({
    commit: async () => {},
    rollback: () => {},
    finish: () => {},
  });
  const initial = engine.replace(
    "blank",
    DEFAULT_TERRAIN_SETTINGS,
    false,
    stage,
  );
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  await initial;
  const pending = engine.replace(
    "blank",
    { ...DEFAULT_TERRAIN_SETTINGS, seed: "cancelled" },
    false,
    stage,
  );
  const rejection = expect(pending).rejects.toThrow("superseded");
  engine.cancelPending();
  worker.reply({
    id: worker.requests[1].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", {
        ...DEFAULT_TERRAIN_SETTINGS,
        seed: "cancelled",
      }),
      tiles: [],
      contours: false,
    },
  });
  await rejection;
  expect(engine.current?.metadata.effectiveSeed).toBe("atlas");
  engine.dispose();
});

it("preserves source fields while enabling contours and keeps previous state after failed derivation", async () => {
  const worker = new BrowserWorker();
  const engine = new TerrainEngine(new WorkerTerrainBackend(() => worker));
  const stage = async () => ({
    commit: async () => {},
    rollback: () => {},
    finish: () => {},
  });
  const initial = engine.replace(
    "blank",
    DEFAULT_TERRAIN_SETTINGS,
    false,
    stage,
  );
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  await initial;
  const failed = engine.setContours(true, stage);
  const rejection = expect(failed).rejects.toThrow("Derivation failed");
  const request = worker.requests[1];
  if (request.command !== "derive")
    throw new Error("Contours must derive from retained source");
  expect(request.source.elevation[0]).toBe(49152);
  worker.reply({
    id: request.id,
    command: "derive",
    ok: false,
    error: "Derivation failed",
  });
  await rejection;
  expect(engine.current?.contours).toBe(false);
  const retry = engine.setContours(true, stage);
  worker.reply({
    id: worker.requests[2].id,
    command: "derive",
    ok: true,
    result: [],
  });
  await retry;
  expect(engine.current?.contours).toBe(true);
  expect(engine.current?.metadata.kind).toBe("blank");
  await engine.setContours(false, stage);
  expect(engine.current?.contours).toBe(false);
  engine.dispose();
});

it("rebuilds presentation from retained source fields after Worker loss", async () => {
  const first = new BrowserWorker();
  const second = new BrowserWorker();
  const workers = [first, second];
  const engine = new TerrainEngine(
    new WorkerTerrainBackend(() => workers.shift()!),
  );
  const stage = async () => ({
    commit: async () => {},
    rollback: () => {},
    finish: () => {},
  });
  const initial = engine.replace(
    "blank",
    DEFAULT_TERRAIN_SETTINGS,
    false,
    stage,
  );
  first.reply({
    id: first.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  await initial;
  first.dispatchEvent(new Event("error"));
  const recovery = engine.recover(stage);
  const request = second.requests[0];
  if (request.command !== "derive")
    throw new Error("Recovery must derive retained fields");
  expect(request.source.elevation[0]).toBe(49152);
  expect(request.source.temperature[0]).toBe(128);
  expect(request.source.metadata.effectiveSeed).toBe("atlas");
  second.reply({ id: request.id, command: "derive", ok: true, result: [] });
  await recovery;
  expect(engine.current?.metadata.seaLevel).toBe(32768);
  engine.dispose();
});

it("rejects late results instead of replacing a newer session", async () => {
  const worker = new BrowserWorker();
  const engine = new TerrainEngine(new WorkerTerrainBackend(() => worker));
  const stage = async () => ({
    commit: async () => {},
    rollback: () => {},
    finish: () => {},
  });
  const older = engine.replace(
    "blank",
    { ...DEFAULT_TERRAIN_SETTINGS, seed: "older" },
    false,
    stage,
  );
  const rejection = expect(older).rejects.toThrow("superseded");
  const newer = engine.replace(
    "blank",
    { ...DEFAULT_TERRAIN_SETTINGS, seed: "newer" },
    false,
    stage,
  );
  worker.reply({
    id: worker.requests[1].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", {
        ...DEFAULT_TERRAIN_SETTINGS,
        seed: "newer",
      }),
      tiles: [],
      contours: false,
    },
  });
  await newer;
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", {
        ...DEFAULT_TERRAIN_SETTINGS,
        seed: "older",
      }),
      tiles: [],
      contours: false,
    },
  });
  await rejection;
  expect(engine.current?.metadata.effectiveSeed).toBe("newer");
  engine.dispose();
});

it("rolls back failed candidate presentation before changing the active session", async () => {
  const worker = new BrowserWorker();
  const engine = new TerrainEngine(new WorkerTerrainBackend(() => worker));
  let visibleSeed = "atlas";
  const initial = engine.replace(
    "blank",
    DEFAULT_TERRAIN_SETTINGS,
    false,
    async () => ({
      commit: async () => {},
      rollback: () => {},
      finish: () => {},
    }),
  );
  worker.reply({
    id: worker.requests[0].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", DEFAULT_TERRAIN_SETTINGS),
      tiles: [],
      contours: false,
    },
  });
  await initial;
  const replacement = engine.replace(
    "blank",
    { ...DEFAULT_TERRAIN_SETTINGS, seed: "new" },
    false,
    async (view) => ({
      commit: async () => {
        visibleSeed = view.metadata.effectiveSeed;
        throw new Error("GPU upload failed");
      },
      rollback: () => {
        visibleSeed = "atlas";
      },
      finish: () => {
        throw new Error(
          "Failed candidates cannot release previous presentation",
        );
      },
    }),
  );
  const rejection = expect(replacement).rejects.toThrow("GPU upload failed");
  worker.reply({
    id: worker.requests[1].id,
    command: "create",
    ok: true,
    result: {
      source: createTerrain("blank", {
        ...DEFAULT_TERRAIN_SETTINGS,
        seed: "new",
      }),
      tiles: [],
      contours: false,
    },
  });
  await rejection;
  expect(engine.current?.metadata.effectiveSeed).toBe("atlas");
  expect(visibleSeed).toBe("atlas");
  engine.dispose();
});
