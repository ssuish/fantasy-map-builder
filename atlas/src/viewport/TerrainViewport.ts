import {
  Application,
  BufferImageSource,
  Container,
  Rectangle,
  RenderTexture,
  Sprite,
  Texture,
} from "pixi.js";
import type { DerivedTile } from "../terrain/derivation";
import type {
  PresentationStage,
  StageTerrain,
  TerrainView,
} from "../terrain/session";
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_COLUMNS,
  TILE_SIZE,
} from "../terrain/types";
import {
  fitViewport,
  panViewport,
  resizeViewport,
  type ViewportPoint,
  type ViewportState,
  zoomViewport,
} from "./transform";

const BACKGROUND = "#151716";
const MAX_DPR = 2;
const HORIZONTAL_COPY_PADDING = 3;
const ZOOM_FACTOR = 1.25;

export interface TerrainViewportCallbacks {
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onError?: (error: Error) => void;
}

interface SceneResources {
  readonly root: Container;
  readonly world: Container;
  readonly textures: Texture[];
  readonly layers: SceneLayer[];
  copyRadius: number;
  destroyed: boolean;
}

interface SceneLayer {
  readonly column: number;
  readonly row: number;
  readonly texture: Texture;
  readonly contourTexture?: Texture;
}

export class TerrainViewport {
  public readonly stage: StageTerrain;

  private readonly host: HTMLElement;
  private readonly callbacks: TerrainViewportCallbacks;
  private app: Application | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private observer: ResizeObserver | null = null;
  private state: ViewportState;
  private activeScene: SceneResources | null = null;
  private pendingStage: ViewportPresentationStage | null = null;
  private stageRevision = 0;
  private enabled = true;
  private panToolEnabled = false;
  private spaceHeld = false;
  private contextLost = false;
  private destroyed = false;
  private activePointer: {
    id: number;
    x: number;
    y: number;
  } | null = null;
  private rebuildPromise: Promise<void> | null = null;

  private constructor(host: HTMLElement, callbacks: TerrainViewportCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.state = fitViewport(1, 1);
    this.stage = (view) => this.prepareStage(view);
  }

  public static async create(
    host: HTMLElement,
    callbacks: TerrainViewportCallbacks = {},
  ): Promise<TerrainViewport> {
    if (!host || typeof host.appendChild !== "function") {
      throw new TypeError("host must be an HTMLElement.");
    }
    const viewport = new TerrainViewport(host, callbacks);
    try {
      await viewport.initializeRenderer();
      return viewport;
    } catch (reason) {
      viewport.reportError(reason);
      viewport.destroy();
      throw reason;
    }
  }

  public get snapshot(): ViewportState {
    return { ...this.state };
  }

  public setPanTool(enabled: boolean): void {
    this.panToolEnabled = enabled;
    this.updateNavigationData();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopPointerDrag();
    this.updateNavigationData();
  }

  public zoomIn(): void {
    this.applyZoom(ZOOM_FACTOR, this.centerPoint());
  }

  public zoomOut(): void {
    this.applyZoom(1 / ZOOM_FACTOR, this.centerPoint());
  }

  public fit(): void {
    if (this.destroyed) return;
    this.state = fitViewport(this.state.width, this.state.height);
    this.renderActiveScene();
  }

  public async rebuild(): Promise<void> {
    if (this.destroyed) return;
    if (this.rebuildPromise) return this.rebuildPromise;
    this.rebuildPromise = this.performRebuild();
    try {
      await this.rebuildPromise;
    } finally {
      this.rebuildPromise = null;
    }
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopPointerDrag();
    this.removeWindowListeners();
    this.disconnectResizeObserver();
    this.cancelPendingStage();
    this.detachCanvasListeners();
    this.destroyScene(this.activeScene);
    this.activeScene = null;

    const app = this.app;
    this.app = null;
    this.canvas = null;
    if (app) {
      app.stage.removeChildren();
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: false },
      );
    }
  }

  private async initializeRenderer(): Promise<void> {
    const { width, height } = this.measureHost();
    this.state = resizeViewport(this.state, width, height);

    const app = new Application();
    await app.init({
      width,
      height,
      background: BACKGROUND,
      backgroundAlpha: 1,
      autoDensity: true,
      resolution: this.devicePixelRatio(),
      preference: "webgl",
      autoStart: false,
    });
    if (app.renderer.name !== "webgl") {
      app.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: false },
      );
      throw new Error("Atlas requires a WebGL renderer.");
    }
    this.contextLost = false;

    const canvas = app.canvas as unknown as HTMLCanvasElement;
    canvas.setAttribute("aria-label", "Terrain map viewport");
    canvas.setAttribute("role", "application");
    canvas.tabIndex = 0;
    canvas.dataset.atlasViewport = "ready";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    this.app = app;
    this.canvas = canvas;
    this.host.appendChild(canvas);
    this.attachCanvasListeners(canvas);
    this.attachResizeObserver();
    this.attachWindowListeners();
    this.updateNavigationData();
  }

  private async performRebuild(): Promise<void> {
    const nextSize = this.measureHost();
    this.state = resizeViewport(this.state, nextSize.width, nextSize.height);
    this.stopPointerDrag();
    this.cancelPendingStage();
    this.disconnectResizeObserver();
    this.detachCanvasListeners();

    const oldApp = this.app;
    this.app = null;
    this.canvas = null;
    this.destroyScene(this.activeScene);
    this.activeScene = null;
    if (oldApp) {
      oldApp.stage.removeChildren();
      oldApp.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: false },
      );
    }

    try {
      await this.initializeRenderer();
    } catch (reason) {
      this.reportError(reason);
      throw reason;
    }
  }

  private async prepareStage(view: TerrainView): Promise<PresentationStage> {
    this.assertUsable();
    const revision = ++this.stageRevision;
    this.cancelPendingStage();
    let scene: SceneResources | undefined;
    try {
      scene = this.createScene(view, this.state);
      this.prepareScene(scene);
    } catch (reason) {
      if (sceneIsDefined(scene)) this.destroyScene(scene);
      this.reportError(reason);
      throw reason;
    }
    if (!scene) throw new Error("Viewport scene was not prepared.");
    const stage = new ViewportPresentationStage(
      this,
      scene,
      this.activeScene,
      revision,
    );
    this.pendingStage = stage;
    return stage;
  }

  private createScene(view: TerrainView, state: ViewportState): SceneResources {
    const root = new Container();
    const world = new Container();
    const textures: Texture[] = [];
    const layers: SceneLayer[] = [];
    root.addChild(world);

    try {
      const tiles = [...view.tiles].sort(
        (first, second) => first.index - second.index,
      );
      for (const tile of tiles) {
        const texture = this.createTexture(tile.rgba, tile, "terrain");
        textures.push(texture);
        const contourTexture =
          view.contours && tile.contours
            ? this.createTexture(tile.contours, tile, "contour")
            : undefined;
        if (contourTexture) textures.push(contourTexture);
        layers.push({
          column: tile.column,
          row: tile.row,
          texture,
          ...(contourTexture === undefined ? {} : { contourTexture }),
        });
      }

      const scene = {
        root,
        world,
        textures,
        layers,
        copyRadius: -1,
        destroyed: false,
      };
      this.ensureHorizontalCopies(scene, state);
      this.applySceneTransform(scene, state);
      return scene;
    } catch (reason) {
      try {
        root.destroy({ children: true });
      } catch (destroyReason) {
        this.reportError(destroyReason);
      }
      for (const texture of textures) {
        try {
          texture.destroy(true);
        } catch (destroyReason) {
          this.reportError(destroyReason);
        }
      }
      throw reason;
    }
  }

  private createTexture(
    rgba: Uint8Array,
    tile: DerivedTile,
    layer: string,
  ): Texture<BufferImageSource> {
    const source = new BufferImageSource({
      resource: rgba,
      width: tile.width,
      height: tile.height,
      format: "rgba8unorm",
      alphaMode: "no-premultiply-alpha",
      scaleMode: "nearest",
      label: `terrain-${layer}-${tile.index}`,
    });
    return new Texture({
      source,
      frame: new Rectangle(1, 1, TILE_SIZE, TILE_SIZE),
      orig: new Rectangle(0, 0, TILE_SIZE, TILE_SIZE),
      label: `terrain-${layer}-${tile.index}-interior`,
    });
  }

  private prepareScene(scene: SceneResources): void {
    const app = this.app;
    if (!app) throw new Error("Viewport renderer is unavailable.");
    const scratch = RenderTexture.create({
      width: this.state.width,
      height: this.state.height,
      resolution: app.renderer.resolution,
    });
    try {
      app.renderer.render({
        container: scene.root,
        target: scratch,
        clear: true,
      });
    } finally {
      scratch.destroy(true);
    }
  }

  async commitStage(stage: ViewportPresentationStage): Promise<void> {
    this.assertUsable();
    if (this.pendingStage !== stage || stage.revision !== this.stageRevision) {
      throw new Error("Viewport presentation was superseded.");
    }
    await nextPresentationOpportunity();
    this.assertCommitOwnership(stage);

    const app = this.app;
    if (!app) throw new Error("Viewport renderer is unavailable.");
    const previous = this.activeScene;
    try {
      this.ensureHorizontalCopies(stage.scene, this.state);
      this.applySceneTransform(stage.scene, this.state);
      app.stage.removeChildren();
      app.stage.addChild(stage.scene.root);
      this.activeScene = stage.scene;
      stage.markCommitted(previous);
      app.renderer.render({ container: app.stage, clear: true });
      await nextPresentationOpportunity();
      this.assertCommitOwnership(stage);
    } catch (reason) {
      if (this.activeScene === stage.scene) this.restoreScene(previous);
      this.reportError(reason);
      throw reason;
    }
  }

  rollbackStage(stage: ViewportPresentationStage): void {
    if (this.activeScene === stage.scene) {
      this.restoreScene(stage.previousScene);
      this.destroyScene(stage.scene);
    } else {
      this.destroyScene(stage.scene);
    }
    if (this.pendingStage === stage) this.pendingStage = null;
  }

  finishStage(stage: ViewportPresentationStage): void {
    const previous = stage.previousScene;
    if (previous && previous !== this.activeScene) this.destroyScene(previous);
    if (this.pendingStage === stage) this.pendingStage = null;
  }

  private assertCommitOwnership(stage: ViewportPresentationStage): void {
    this.assertUsable();
    if (
      this.pendingStage !== stage ||
      stage.revision !== this.stageRevision ||
      stage.isFinished
    ) {
      throw new Error("Viewport presentation was superseded.");
    }
  }

  private restoreScene(scene: SceneResources | null): void {
    const app = this.app;
    try {
      if (app) app.stage.removeChildren();
      if (scene && !scene.destroyed) {
        this.activeScene = scene;
        this.applySceneTransform(scene, this.state);
        app?.stage.addChild(scene.root);
        if (app && !this.rendererIsLost()) {
          app.renderer.render({ container: app.stage, clear: true });
        }
      } else {
        this.activeScene = null;
        if (app && !this.rendererIsLost()) {
          app.renderer.render({ container: app.stage, clear: true });
        }
      }
    } catch (reason) {
      this.reportError(reason);
    }
  }

  private cancelPendingStage(): void {
    const pending = this.pendingStage;
    this.pendingStage = null;
    if (pending) pending.cancel();
  }

  private applyZoom(factor: number, anchor: ViewportPoint): void {
    if (this.destroyed || !this.enabled) return;
    this.state = zoomViewport(this.state, factor, anchor);
    this.renderActiveScene();
  }

  private renderActiveScene(): void {
    const app = this.app;
    const scene = this.activeScene;
    if (!app || !scene || this.contextLost || this.destroyed) return;
    if (this.rendererIsLost()) {
      this.markContextLost();
      return;
    }
    this.ensureHorizontalCopies(scene, this.state);
    this.applySceneTransform(scene, this.state);
    try {
      app.renderer.render({ container: app.stage, clear: true });
    } catch (reason) {
      this.reportError(reason);
    }
    this.updateNavigationData();
  }

  private applySceneTransform(
    scene: SceneResources,
    state: ViewportState,
  ): void {
    scene.world.scale.set(state.scale);
    scene.world.position.set(
      state.width / 2 - state.centerX * state.scale,
      state.height / 2 - state.centerY * state.scale,
    );
  }

  private ensureHorizontalCopies(
    scene: SceneResources,
    state: ViewportState,
  ): void {
    const targetRadius = this.horizontalCopies(state);
    if (targetRadius <= scene.copyRadius) return;

    for (const layer of scene.layers) {
      for (let copy = -targetRadius; copy <= targetRadius; copy += 1) {
        if (Math.abs(copy) <= scene.copyRadius) continue;
        const x = (layer.column + copy * TILE_COLUMNS) * TILE_SIZE;
        const y = layer.row * TILE_SIZE;
        const sprite = new Sprite(layer.texture);
        sprite.position.set(x, y);
        scene.world.addChild(sprite);
        if (layer.contourTexture) {
          const contourSprite = new Sprite(layer.contourTexture);
          contourSprite.position.set(x, y);
          scene.world.addChild(contourSprite);
        }
      }
    }
    scene.copyRadius = targetRadius;
  }

  private horizontalCopies(state: ViewportState): number {
    const fitScale = Math.min(
      state.width / MAP_WIDTH,
      state.height / MAP_HEIGHT,
    );
    const coverageScale = Math.min(state.scale, fitScale);
    const visibleMapWidth = state.width / coverageScale;
    return Math.max(
      HORIZONTAL_COPY_PADDING,
      Math.ceil(visibleMapWidth / MAP_WIDTH) + HORIZONTAL_COPY_PADDING,
    );
  }

  private centerPoint(): ViewportPoint {
    return { x: this.state.width / 2, y: this.state.height / 2 };
  }

  private measureHost(): { width: number; height: number } {
    const rect = this.host.getBoundingClientRect();
    const width = this.host.clientWidth || rect.width;
    const height = this.host.clientHeight || rect.height;
    return {
      width: positiveDimension(width),
      height: positiveDimension(height),
    };
  }

  private devicePixelRatio(): number {
    return Math.min(
      MAX_DPR,
      typeof window === "undefined" || !Number.isFinite(window.devicePixelRatio)
        ? 1
        : Math.max(1, window.devicePixelRatio),
    );
  }

  private attachCanvasListeners(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    canvas.addEventListener("lostpointercapture", this.onLostPointerCapture);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored);
  }

  private detachCanvasListeners(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.removeEventListener("pointerdown", this.onPointerDown);
    canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp);
    canvas.removeEventListener("pointercancel", this.onPointerCancel);
    canvas.removeEventListener("lostpointercapture", this.onLostPointerCapture);
    canvas.removeEventListener("wheel", this.onWheel);
    canvas.removeEventListener("webglcontextlost", this.onContextLost);
    canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
  }

  private attachResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") return;
    this.observer = new ResizeObserver(() => this.resizeToHost());
    this.observer.observe(this.host);
  }

  private disconnectResizeObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private resizeToHost(): void {
    if (this.destroyed || !this.app) return;
    const size = this.measureHost();
    if (size.width === this.state.width && size.height === this.state.height)
      return;
    this.state = resizeViewport(this.state, size.width, size.height);
    this.app.renderer.resize(size.width, size.height, this.devicePixelRatio());
    this.renderActiveScene();
  }

  private attachWindowListeners(): void {
    window.addEventListener("keydown", this.onKeyDown, true);
    window.addEventListener("keyup", this.onKeyUp, true);
    window.addEventListener("blur", this.onWindowBlur);
  }

  private removeWindowListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", this.onKeyDown, true);
    window.removeEventListener("keyup", this.onKeyUp, true);
    window.removeEventListener("blur", this.onWindowBlur);
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (
      this.destroyed ||
      !this.enabled ||
      this.contextLost ||
      event.button !== 0 ||
      (!this.panToolEnabled && !this.spaceHeld)
    ) {
      return;
    }
    const point = this.canvasPoint(event.clientX, event.clientY);
    this.activePointer = { id: event.pointerId, x: point.x, y: point.y };
    this.canvas?.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.activePointer || this.activePointer.id !== event.pointerId)
      return;
    const point = this.canvasPoint(event.clientX, event.clientY);
    const dx = point.x - this.activePointer.x;
    const dy = point.y - this.activePointer.y;
    this.activePointer = { id: event.pointerId, x: point.x, y: point.y };
    if (!this.enabled || this.contextLost) return;
    this.state = panViewport(this.state, dx, dy);
    this.renderActiveScene();
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.activePointer?.id !== event.pointerId) return;
    this.stopPointerDrag();
  };

  private onPointerCancel = (event: PointerEvent): void => {
    if (this.activePointer?.id !== event.pointerId) return;
    this.stopPointerDrag();
  };

  private onLostPointerCapture = (): void => {
    this.stopPointerDrag();
  };

  private onWheel = (event: WheelEvent): void => {
    if (this.destroyed || !this.enabled || this.contextLost) return;
    event.preventDefault();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    if (!Number.isFinite(delta) || delta === 0) return;
    const factor = Math.exp(-delta * 0.001);
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.applyZoom(factor, this.canvasPoint(event.clientX, event.clientY));
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (
      this.destroyed ||
      !this.enabled ||
      event.code !== "Space" ||
      isTypingTarget(event.target)
    ) {
      return;
    }
    this.spaceHeld = true;
    event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === "Space") this.spaceHeld = false;
  };

  private onWindowBlur = (): void => {
    this.spaceHeld = false;
    this.stopPointerDrag();
  };

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.markContextLost();
    this.safeCallback(this.callbacks.onContextLost);
  };

  private onContextRestored = (): void => {
    this.contextLost = false;
    this.updateNavigationData();
    this.safeCallback(this.callbacks.onContextRestored);
  };

  private canvasPoint(clientX: number, clientY: number): ViewportPoint {
    const rect = this.canvas?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  private stopPointerDrag(): void {
    const pointer = this.activePointer;
    this.activePointer = null;
    if (pointer && this.canvas?.hasPointerCapture(pointer.id)) {
      this.canvas.releasePointerCapture(pointer.id);
    }
  }

  private updateNavigationData(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.dataset.atlasNavigation = this.enabled ? "enabled" : "disabled";
    canvas.dataset.atlasReady = this.contextLost ? "context-lost" : "ready";
    canvas.dataset.atlasPanTool = this.panToolEnabled ? "on" : "off";
  }

  private safeCallback(callback: (() => void) | undefined): void {
    try {
      callback?.();
    } catch (reason) {
      this.reportError(reason);
    }
  }

  private destroyScene(scene: SceneResources | null): void {
    if (!scene || scene.destroyed) return;
    scene.destroyed = true;
    try {
      scene.root.destroy({ children: true });
    } catch (reason) {
      this.reportError(reason);
    }
    for (const texture of scene.textures) {
      try {
        texture.destroy(true);
      } catch (reason) {
        this.reportError(reason);
      }
    }
  }

  private assertUsable(): void {
    if (this.destroyed || !this.app) {
      throw new Error("Viewport is unavailable.");
    }
    if (this.contextLost || this.rendererIsLost()) {
      this.markContextLost();
      throw new Error("Viewport WebGL context is lost.");
    }
  }

  private rendererIsLost(): boolean {
    const renderer = this.app?.renderer as unknown as {
      context?: { isLost?: boolean };
      gl?: { isContextLost?: () => boolean };
    };
    try {
      return Boolean(
        renderer?.context?.isLost || renderer?.gl?.isContextLost?.(),
      );
    } catch {
      return true;
    }
  }

  private markContextLost(): void {
    this.contextLost = true;
    this.stopPointerDrag();
    this.updateNavigationData();
  }

  private reportError(reason: unknown): void {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    try {
      this.callbacks.onError?.(error);
    } catch {
      // Error callbacks cannot disrupt presentation cleanup.
    }
  }
}

class ViewportPresentationStage implements PresentationStage {
  private committed = false;
  private finished = false;
  private previous: SceneResources | null;

  public constructor(
    private readonly owner: TerrainViewport,
    public readonly scene: SceneResources,
    previous: SceneResources | null,
    public readonly revision: number,
  ) {
    this.previous = previous;
  }

  public get previousScene(): SceneResources | null {
    return this.previous;
  }

  public get isFinished(): boolean {
    return this.finished;
  }

  public async commit(): Promise<void> {
    if (this.finished) {
      throw new Error("Viewport presentation stage is finished.");
    }
    if (this.committed) return;
    await this.owner.commitStage(this);
  }

  public rollback(): void {
    if (this.finished) return;
    this.owner.rollbackStage(this);
    this.finished = true;
  }

  public finish(): void {
    if (this.finished) return;
    if (this.committed) this.owner.finishStage(this);
    else this.owner.rollbackStage(this);
    this.finished = true;
    this.previous = null;
  }

  public markCommitted(previous: SceneResources | null): void {
    this.previous = previous;
    this.committed = true;
  }

  public cancel(): void {
    if (this.finished) return;
    this.owner.rollbackStage(this);
    this.finished = true;
  }
}

function sceneIsDefined(
  scene: SceneResources | undefined,
): scene is SceneResources {
  return scene !== undefined;
}

function positiveDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const candidates = [
    target instanceof HTMLElement ? target : null,
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  ];
  return candidates.some((element) => {
    if (!element) return false;
    if (element.isContentEditable || element.closest("[contenteditable]")) {
      return true;
    }
    return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(element.tagName);
  });
}

function nextPresentationOpportunity(): Promise<void> {
  // requestAnimationFrame is the browser-visible scheduling proxy available here;
  // it does not prove that a physical display scanout has occurred.
  if (typeof requestAnimationFrame === "function") {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  return Promise.resolve();
}
