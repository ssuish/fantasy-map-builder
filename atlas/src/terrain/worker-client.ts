import type { DerivedTile } from "./derivation";
import type { TerrainKind, TerrainSettings, TerrainSource } from "./types";
import type {
  TerrainBackend,
  TerrainCandidate,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

type WorkerPort = Pick<
  Worker,
  "postMessage" | "terminate" | "addEventListener" | "removeEventListener"
>;

export class WorkerTerrainBackend implements TerrainBackend {
  private worker: WorkerPort | undefined;
  private nextId = 0;
  private disposed = false;
  private pending = new Map<
    number,
    {
      command: WorkerRequest["command"];
      resolve: (value: TerrainCandidate | DerivedTile[]) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(
    private readonly factory: () => WorkerPort = () =>
      new Worker(new URL("./terrain.worker.ts", import.meta.url), {
        type: "module",
      }),
    private readonly timeoutMs = 30_000,
  ) {}

  create(
    kind: TerrainKind,
    settings: TerrainSettings,
    contours: boolean,
  ): Promise<TerrainCandidate> {
    return this.request<TerrainCandidate>({
      id: ++this.nextId,
      command: "create",
      kind,
      settings,
      contours,
    });
  }

  derive(
    source: TerrainSource,
    indices: readonly number[] | undefined,
    contours: boolean,
  ): Promise<DerivedTile[]> {
    return this.request<DerivedTile[]>({
      id: ++this.nextId,
      command: "derive",
      source,
      indices,
      contours,
    });
  }

  private request<T extends TerrainCandidate | DerivedTile[]>(
    request: WorkerRequest,
  ): Promise<T> {
    if (this.disposed)
      return Promise.reject(new Error("Terrain Worker is disposed."));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.rejectAll(
          new Error("Terrain Worker timed out. Retry using the same settings."),
        );
      }, this.timeoutMs);
      this.pending.set(request.id, {
        command: request.command,
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      try {
        if (!this.worker) {
          this.worker = this.factory();
          this.worker.addEventListener("message", this.receive);
          this.worker.addEventListener("error", this.failed);
          this.worker.addEventListener("messageerror", this.failed);
        }
        this.worker.postMessage(request);
      } catch (error) {
        this.rejectAll(
          error instanceof Error
            ? error
            : new Error("Cannot start terrain Worker."),
        );
      }
    });
  }

  private receive = (event: Event) => {
    const response = (event as MessageEvent<WorkerResponse>).data;
    if (
      !response ||
      typeof response !== "object" ||
      !Number.isInteger(response.id)
    ) {
      this.rejectAll(new Error("Terrain Worker returned an invalid response."));
      return;
    }
    const pending = this.pending.get(response.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    if (response.command !== pending.command)
      pending.reject(new Error("Terrain Worker returned the wrong command."));
    else if (!response.ok) pending.reject(new Error(response.error));
    else pending.resolve(response.result);
    this.pending.delete(response.id);
  };

  private failed = () => {
    this.rejectAll(
      new Error(
        "Terrain Worker stopped. Retry creation using the same settings.",
      ),
    );
  };

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.releaseWorker();
  }

  private releaseWorker(): void {
    this.worker?.removeEventListener("message", this.receive);
    this.worker?.removeEventListener("error", this.failed);
    this.worker?.removeEventListener("messageerror", this.failed);
    this.worker?.terminate();
    this.worker = undefined;
  }

  dispose(): void {
    this.disposed = true;
    this.rejectAll(new Error("Terrain Worker is disposed."));
  }
}
