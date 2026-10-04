import { describe, expect, it } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH } from "../src/terrain/types";
import {
  fitViewport,
  mapToScreen,
  panViewport,
  resizeViewport,
  screenToMap,
  zoomViewport,
} from "../src/viewport/transform";

describe("viewport transforms", () => {
  it("fits the complete fixed map inside the viewport", () => {
    expect(fitViewport(1024, 768)).toEqual({
      width: 1024,
      height: 768,
      centerX: MAP_WIDTH / 2,
      centerY: MAP_HEIGHT / 2,
      scale: 0.5,
    });
  });

  it("wraps east and west continuously while keeping map Y bounded", () => {
    const state = {
      width: 1000,
      height: 500,
      centerX: MAP_WIDTH - 1,
      centerY: 512,
      scale: 1,
    } as const;

    expect(screenToMap(state, { x: 502, y: 0 })).toEqual({ x: 1, y: 262 });
    expect(screenToMap(state, { x: -100, y: 10000 })).toEqual({
      x: MAP_WIDTH - 601,
      y: MAP_HEIGHT,
    });
  });

  it("clamps pan at finite north and south edges", () => {
    const state = {
      width: 1024,
      height: 768,
      centerX: MAP_WIDTH / 2,
      centerY: MAP_HEIGHT / 2,
      scale: 1,
    } as const;

    expect(panViewport(state, 0, 1000).centerY).toBe(384);
    expect(panViewport(state, 0, -1000).centerY).toBe(640);
  });

  it("centers north/south when the full world is shorter than the viewport", () => {
    const state = {
      width: 4096,
      height: 4096,
      centerX: 100,
      centerY: 100,
      scale: 2,
    } as const;

    expect(panViewport(state, 0, 1000).centerY).toBe(MAP_HEIGHT / 2);
  });

  it("preserves navigation while resizing and raises scale to the new fit minimum", () => {
    const state = fitViewport(1024, 768);
    expect(resizeViewport(state, 2048, 1024)).toEqual({
      width: 2048,
      height: 1024,
      centerX: MAP_WIDTH / 2,
      centerY: MAP_HEIGHT / 2,
      scale: 1,
    });
  });

  it("keeps the map point below a zoom anchor, including across the seam", () => {
    const state = {
      width: 100,
      height: 100,
      centerX: MAP_WIDTH - 1,
      centerY: MAP_HEIGHT / 2,
      scale: 1,
    } as const;
    const anchor = { x: 99, y: 41 };
    const before = screenToMap(state, anchor);
    const after = zoomViewport(state, 2, anchor);

    expect(screenToMap(after, anchor)).toEqual(before);
    expect(after.scale).toBe(2);
  });

  it("maps to the nearest horizontal wrapped copy", () => {
    const state = {
      width: 100,
      height: 100,
      centerX: MAP_WIDTH - 1,
      centerY: MAP_HEIGHT / 2,
      scale: 1,
    } as const;

    expect(mapToScreen(state, { x: 1, y: 512 })).toEqual({ x: 52, y: 50 });
  });

  it("clamps extreme zoom to fit and eight CSS pixels per sample", () => {
    const state = fitViewport(1024, 768);
    expect(() =>
      zoomViewport(state, Number.POSITIVE_INFINITY, { x: 512, y: 384 }),
    ).toThrow();
    expect(zoomViewport(state, 1000, { x: 512, y: 384 }).scale).toBe(8);
    expect(
      zoomViewport({ ...state, scale: 8 }, 0.00001, { x: 512, y: 384 }).scale,
    ).toBe(state.scale);
  });

  it("rejects non-finite or non-positive dimensions and zoom factors", () => {
    expect(() => fitViewport(0, 100)).toThrow();
    expect(() => fitViewport(Number.NaN, 100)).toThrow();
    const state = fitViewport(1024, 768);
    expect(() => resizeViewport(state, -1, 100)).toThrow();
    expect(() => zoomViewport(state, 0, { x: 0, y: 0 })).toThrow();
    expect(() => zoomViewport(state, Number.NaN, { x: 0, y: 0 })).toThrow();
  });
});
