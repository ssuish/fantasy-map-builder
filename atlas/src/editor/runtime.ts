import { TerrainEngine, type TerrainView } from "../terrain/session";
import { WorkerTerrainBackend } from "../terrain/worker-client";
import type { TerrainKind, TerrainSettings } from "../terrain/types";
import { TerrainViewport } from "../viewport/TerrainViewport";

export type GraphicsState = "ready" | "recovering" | "failed";
export type GraphicsListener = (state: GraphicsState, error?: string) => void;

export class EditorRuntime {
  private graphics: GraphicsState = "ready";
  private recoveryEpoch = 0;
  private disposed = false;

  private constructor(
    private readonly engine: TerrainEngine,
    private readonly viewport: TerrainViewport,
    private readonly notify: GraphicsListener,
  ) {}

  static async create(
    host: HTMLElement,
    notify: GraphicsListener = () => {},
  ): Promise<EditorRuntime> {
    const engine = new TerrainEngine(new WorkerTerrainBackend());
    let runtime: EditorRuntime | undefined;
    let lostDuringInit = false;
    try {
      const viewport = await TerrainViewport.create(host, {
        onContextLost: () => {
          if (runtime) runtime.contextLost();
          else lostDuringInit = true;
        },
      });
      runtime = new EditorRuntime(engine, viewport, notify);
      viewport.setEnabled(false);
      if (lostDuringInit) await runtime.retryGraphics();
      return runtime;
    } catch (error) {
      if (runtime) runtime.destroy();
      else engine.dispose();
      throw error;
    }
  }

  get current(): TerrainView | null {
    return this.engine.current;
  }

  get navigation() {
    return this.viewport.snapshot;
  }

  async createMap(
    kind: TerrainKind,
    settings: TerrainSettings,
  ): Promise<TerrainView> {
    this.requireGraphics();
    const view = await this.engine.replace(
      kind,
      settings,
      this.current?.contours ?? false,
      this.viewport.stage,
    );
    this.requireGraphics();
    this.viewport.setEnabled(true);
    return view;
  }

  async setContours(enabled: boolean): Promise<TerrainView> {
    this.requireGraphics();
    return this.engine.setContours(enabled, this.viewport.stage);
  }

  setPanTool(enabled: boolean): void {
    this.viewport.setPanTool(enabled);
  }

  zoomIn(): void {
    this.viewport.zoomIn();
  }

  zoomOut(): void {
    this.viewport.zoomOut();
  }

  fit(): void {
    this.viewport.fit();
  }

  cancelPending(): void {
    this.engine.cancelPending();
  }

  private requireGraphics(): void {
    if (this.disposed) throw new Error("Editing Session has ended.");
    if (this.graphics !== "ready")
      throw new Error("Retry the renderer before creating terrain.");
  }

  private contextLost(): void {
    if (this.disposed) return;
    this.viewport.setEnabled(false);
    if (this.graphics === "failed") return;
    if (this.graphics === "recovering") {
      this.recoveryEpoch += 1;
      this.engine.cancelPending();
      this.graphics = "failed";
      this.notify(
        "failed",
        "Graphics were lost again during recovery. Retry the renderer. Refresh loses session content.",
      );
      return;
    }
    void this.retryGraphics().catch(() => {});
  }

  async retryGraphics(): Promise<void> {
    if (this.disposed) throw new Error("Editing Session has ended.");
    if (this.graphics === "recovering")
      throw new Error("Graphics recovery is already running.");
    const epoch = ++this.recoveryEpoch;
    this.engine.cancelPending();
    this.graphics = "recovering";
    this.viewport.setEnabled(false);
    this.notify("recovering");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Graphics recovery exceeded 10 seconds.")),
          10_000,
        );
      });
      const recovery = (async () => {
        await this.viewport.rebuild();
        this.assertRecovery(epoch);
        if (this.engine.current) await this.engine.recover(this.viewport.stage);
        this.assertRecovery(epoch);
      })();
      await Promise.race([recovery, deadline]);
      this.assertRecovery(epoch);
      this.graphics = "ready";
      this.viewport.setEnabled(this.engine.current !== null);
      this.notify("ready");
    } catch (error) {
      if (!this.disposed && epoch === this.recoveryEpoch) {
        this.recoveryEpoch += 1;
        this.engine.cancelPending();
        this.graphics = "failed";
        this.viewport.setEnabled(false);
        const reason =
          error instanceof Error ? error.message : "Graphics recovery failed.";
        this.notify(
          "failed",
          `${reason} Retry the renderer. Refresh loses session content.`,
        );
      }
      throw error;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private assertRecovery(epoch: number): void {
    if (this.disposed || epoch !== this.recoveryEpoch)
      throw new Error("Graphics recovery was superseded.");
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.recoveryEpoch += 1;
    this.engine.dispose();
    this.viewport.destroy();
  }
}
