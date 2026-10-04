import { MAP_HEIGHT, MAP_WIDTH } from "../terrain/types";

const MAX_SCALE = 8;

export interface ViewportState {
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly scale: number;
}

export interface ViewportPoint {
  readonly x: number;
  readonly y: number;
}

export const VIEWPORT_MAX_SCALE = MAX_SCALE;

export function fitViewport(width: number, height: number): ViewportState {
  validateDimensions(width, height);
  return {
    width,
    height,
    centerX: MAP_WIDTH / 2,
    centerY: MAP_HEIGHT / 2,
    scale: Math.min(MAX_SCALE, fitScale(width, height)),
  };
}

export function resizeViewport(
  state: ViewportState,
  width: number,
  height: number,
): ViewportState {
  validateState(state);
  validateDimensions(width, height);
  return normalizeState({
    width,
    height,
    centerX: state.centerX,
    centerY: state.centerY,
    scale: clampScale(state.scale, width, height),
  });
}

/** Pan by a screen delta. Positive deltas move the map with the pointer. */
export function panViewport(
  state: ViewportState,
  dxScreen: number,
  dyScreen: number,
): ViewportState {
  validateState(state);
  validateFinite(dxScreen, "dxScreen");
  validateFinite(dyScreen, "dyScreen");
  return normalizeState({
    ...state,
    centerX: state.centerX - dxScreen / state.scale,
    centerY: state.centerY - dyScreen / state.scale,
  });
}

export function zoomViewport(
  state: ViewportState,
  factor: number,
  anchor: ViewportPoint,
): ViewportState {
  validateState(state);
  validateFinite(factor, "factor");
  if (factor <= 0) throw new RangeError("factor must be positive.");
  validatePoint(anchor, "anchor");

  const scale = clampScale(state.scale * factor, state.width, state.height);
  const rawMapX = state.centerX + (anchor.x - state.width / 2) / state.scale;
  const rawMapY = state.centerY + (anchor.y - state.height / 2) / state.scale;
  return normalizeState({
    ...state,
    scale,
    centerX: rawMapX - (anchor.x - state.width / 2) / scale,
    centerY: rawMapY - (anchor.y - state.height / 2) / scale,
  });
}

export function screenToMap(
  state: ViewportState,
  point: ViewportPoint,
): ViewportPoint {
  validateState(state);
  validatePoint(point, "point");
  return {
    x: wrapCoordinate(
      state.centerX + (point.x - state.width / 2) / state.scale,
      MAP_WIDTH,
    ),
    y: clamp(
      state.centerY + (point.y - state.height / 2) / state.scale,
      0,
      MAP_HEIGHT,
    ),
  };
}

export function mapToScreen(
  state: ViewportState,
  point: ViewportPoint,
): ViewportPoint {
  validateState(state);
  validatePoint(point, "point");
  let deltaX = wrapCoordinate(point.x, MAP_WIDTH) - state.centerX;
  if (deltaX > MAP_WIDTH / 2) deltaX -= MAP_WIDTH;
  if (deltaX < -MAP_WIDTH / 2) deltaX += MAP_WIDTH;
  return {
    x: state.width / 2 + deltaX * state.scale,
    y:
      state.height / 2 +
      (clamp(point.y, 0, MAP_HEIGHT) - state.centerY) * state.scale,
  };
}

function validateState(state: ViewportState): void {
  if (state === null || typeof state !== "object") {
    throw new TypeError("state must be an object.");
  }
  validateDimensions(state.width, state.height);
  validateFinite(state.centerX, "centerX");
  validateFinite(state.centerY, "centerY");
  validateFinite(state.scale, "scale");
  if (state.scale <= 0) throw new RangeError("scale must be positive.");
}

function normalizeState(state: ViewportState): ViewportState {
  const visibleMapHeight = state.height / state.scale;
  return {
    ...state,
    centerX: wrapCoordinate(state.centerX, MAP_WIDTH),
    centerY:
      visibleMapHeight >= MAP_HEIGHT
        ? MAP_HEIGHT / 2
        : clamp(
            state.centerY,
            visibleMapHeight / 2,
            MAP_HEIGHT - visibleMapHeight / 2,
          ),
  };
}

function clampScale(scale: number, width: number, height: number): number {
  return clamp(scale, fitScale(width, height), MAX_SCALE);
}

function fitScale(width: number, height: number): number {
  return Math.min(width / MAP_WIDTH, height / MAP_HEIGHT);
}

function validateDimensions(width: number, height: number): void {
  validateFinite(width, "width");
  validateFinite(height, "height");
  if (width <= 0 || height <= 0) {
    throw new RangeError("width and height must be positive.");
  }
}

function validatePoint(point: ViewportPoint, name: string): void {
  if (point === null || typeof point !== "object") {
    throw new TypeError(`${name} must be an object.`);
  }
  validateFinite(point.x, `${name}.x`);
  validateFinite(point.y, `${name}.y`);
}

function validateFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
}

function wrapCoordinate(value: number, size: number): number {
  return ((value % size) + size) % size;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
