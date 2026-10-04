import type { DerivedTile } from "./derivation";
import type { TerrainBackend, TerrainCandidate } from "./protocol";
import type { TerrainKind, TerrainMetadata, TerrainSettings } from "./types";

export interface TerrainView {
  readonly id: number;
  readonly metadata: Readonly<TerrainMetadata>;
  readonly tiles: readonly DerivedTile[];
  readonly contours: boolean;
}

export interface PresentationStage {
  commit(): Promise<void>;
  rollback(): void;
  finish(): void;
}

export type StageTerrain = (view: TerrainView) => Promise<PresentationStage>;

export class TerrainEngine {
  private active: TerrainCandidate | null = null;
  private view: TerrainView | null = null;
  private nextId = 0;
  private revision = 0;

  constructor(private readonly backend: TerrainBackend) {}

  get current(): TerrainView | null {
    return this.view;
  }

  async replace(
    kind: TerrainKind,
    settings: TerrainSettings,
    contours: boolean,
    stageTerrain: StageTerrain,
  ): Promise<TerrainView> {
    const revision = ++this.revision;
    const candidate = await this.backend.create(kind, settings, contours);
    return this.present(candidate, revision, stageTerrain);
  }

  async recover(stageTerrain: StageTerrain): Promise<TerrainView> {
    if (!this.active) throw new Error("No Editing Session to recover.");
    const revision = ++this.revision;
    const active = this.active;
    const tiles = await this.backend.derive(
      active.source,
      undefined,
      active.contours,
    );
    return this.present({ ...active, tiles }, revision, stageTerrain);
  }

  async setContours(
    enabled: boolean,
    stageTerrain: StageTerrain,
  ): Promise<TerrainView> {
    if (!this.active || !this.view)
      throw new Error("Create a Map before changing contours.");
    if (this.view.contours === enabled) return this.view;
    const revision = ++this.revision;
    const active = this.active;
    const cached =
      active.tiles.length > 0 &&
      active.tiles.every((tile) => tile.contours !== undefined);
    const tiles =
      enabled && !cached
        ? await this.backend.derive(active.source, undefined, true)
        : active.tiles;
    return this.present(
      { ...active, tiles, contours: enabled },
      revision,
      stageTerrain,
    );
  }

  private async present(
    candidate: TerrainCandidate,
    revision: number,
    stageTerrain: StageTerrain,
  ): Promise<TerrainView> {
    this.assertCurrent(revision);
    const view: TerrainView = Object.freeze({
      id: ++this.nextId,
      metadata: Object.freeze({
        ...candidate.source.metadata,
        settings: Object.freeze({ ...candidate.source.metadata.settings }),
      }),
      tiles: candidate.tiles,
      contours: candidate.contours,
    });
    const stage = await stageTerrain(view);
    try {
      this.assertCurrent(revision);
      await stage.commit();
      this.assertCurrent(revision);
    } catch (error) {
      stage.rollback();
      throw error;
    }
    this.active = candidate;
    this.view = view;
    stage.finish();
    return view;
  }

  private assertCurrent(revision: number): void {
    if (revision !== this.revision)
      throw new Error("Terrain operation was superseded.");
  }

  cancelPending(): void {
    this.revision += 1;
  }

  dispose(): void {
    this.revision += 1;
    this.backend.dispose();
    this.active = null;
    this.view = null;
  }
}
