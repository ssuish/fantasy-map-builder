import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from "react";
import {
  DEFAULT_TERRAIN_SETTINGS,
  type TerrainKind,
  type TerrainSettings,
} from "../terrain/types";
import type { TerrainView } from "../terrain/session";
import { EditorRuntime, type GraphicsState } from "./runtime";
import { CreationForm } from "./CreationForm";
import "./editor.css";

interface CreationCandidate {
  kind: TerrainKind;
  settings: TerrainSettings;
}

type GenerationState = "idle" | "generating" | "presenting" | "ready" | "error";

const INITIAL_CANDIDATE: CreationCandidate = {
  kind: "blank",
  settings: { ...DEFAULT_TERRAIN_SETTINGS },
};

function cloneCandidate(candidate: CreationCandidate): CreationCandidate {
  return { kind: candidate.kind, settings: { ...candidate.settings } };
}

function randomSeed(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `${values[0].toString(36)}-${values[1].toString(36)}`;
}

function reasonMessage(reason: unknown): string {
  return reason instanceof Error
    ? reason.message
    : "The terrain could not be created.";
}

function useGenerationMeasurement(
  canvasHostRef: MutableRefObject<HTMLDivElement | null>,
  session: TerrainView | null,
  generating: boolean,
  error: string | undefined,
  pendingGeneration: MutableRefObject<"success" | "failure" | null>,
  onPresented: () => void,
) {
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const outcome = pendingGeneration.current;
    if (!outcome || generating) return;
    if (outcome === "success" && !session) return;
    if (outcome === "failure" && !error) return;

    let settledFrames = 0;
    const settleAfterLayout = () => {
      frameRef.current = requestAnimationFrame(() => {
        const host = canvasHostRef.current;
        const hasLayout =
          outcome === "failure" ||
          (host !== null &&
            host.getBoundingClientRect().width > 0 &&
            host.getBoundingClientRect().height > 0);
        if ((settledFrames < 2 || !hasLayout) && settledFrames < 8) {
          settledFrames += 1;
          settleAfterLayout();
          return;
        }
        const measureName =
          outcome === "success"
            ? "atlas:generation"
            : "atlas:generation-failed";
        try {
          performance.measure(measureName, "atlas:generation-start");
        } catch {
          // Performance marks are best-effort diagnostics and never block editing.
        }
        performance.clearMarks("atlas:generation-start");
        pendingGeneration.current = null;
        if (outcome === "success") onPresented();
      });
    };
    settleAfterLayout();

    return () => {
      if (frameRef.current !== undefined)
        cancelAnimationFrame(frameRef.current);
    };
  }, [
    canvasHostRef,
    error,
    generating,
    onPresented,
    pendingGeneration,
    session,
  ]);
}

export default function Editor() {
  const editorRef = useRef<HTMLElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<EditorRuntime | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const pendingGenerationRef = useRef<"success" | "failure" | null>(null);

  const [runtime, setRuntime] = useState<EditorRuntime | null>(null);
  const [runtimeAttempt, setRuntimeAttempt] = useState(0);
  const [initializationError, setInitializationError] = useState<string>();
  const [graphicsState, setGraphicsState] = useState<GraphicsState>("ready");
  const [graphicsError, setGraphicsError] = useState<string>();
  const [session, setSession] = useState<TerrainView | null>(null);
  const [candidate, setCandidate] = useState<CreationCandidate>(() =>
    cloneCandidate(INITIAL_CANDIDATE),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string>();
  const [generationState, setGenerationState] =
    useState<GenerationState>("idle");
  const [panSelected, setPanSelected] = useState(false);
  const [contoursPending, setContoursPending] = useState(false);
  const [controlError, setControlError] = useState<string>();

  const notifyGraphics = useCallback((state: GraphicsState, error?: string) => {
    setGraphicsState(state);
    setGraphicsError(error);
    if (state === "ready") {
      setSession((current) => runtimeRef.current?.current ?? current);
    }
  }, []);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    let active = true;
    let created: EditorRuntime | undefined;
    setInitializationError(undefined);
    setGraphicsState("recovering");

    void EditorRuntime.create(host, notifyGraphics)
      .then((nextRuntime) => {
        if (!active) {
          nextRuntime.destroy();
          return;
        }
        created = nextRuntime;
        runtimeRef.current = nextRuntime;
        setRuntime(nextRuntime);
        setGraphicsState("ready");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRuntime(null);
        runtimeRef.current = null;
        setGraphicsState("failed");
        setInitializationError(reasonMessage(reason));
      });

    return () => {
      active = false;
      created?.destroy();
      if (runtimeRef.current === created) runtimeRef.current = null;
      setRuntime((current) => (current === created ? null : current));
    };
  }, [notifyGraphics, runtimeAttempt]);

  const closeDialog = useCallback(
    (returnFocus = true, force = false) => {
      if (generating && !force) return;
      setDialogOpen(false);
      if (returnFocus) {
        requestAnimationFrame(() => openerRef.current?.focus());
      }
    },
    [generating],
  );

  useEffect(() => {
    if (!dialogOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelector =
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])';
    const firstDialogControl = dialog.querySelector<HTMLElement>(
      "[data-dialog-initial-focus]",
    );
    (firstDialogControl ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const activeIndex = focusable.indexOf(active as HTMLElement);
      if (activeIndex < 0) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeIndex === 0) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, dialogOpen]);

  const setSettings = (settings: TerrainSettings) =>
    setCandidate((current) => ({ ...current, settings }));

  const handleRandomSeed = () =>
    setSettings({ ...candidate.settings, seed: randomSeed() });

  const markGenerationReady = useCallback(
    () => setGenerationState("ready"),
    [],
  );

  useGenerationMeasurement(
    canvasHostRef,
    session,
    generating,
    generationError,
    pendingGenerationRef,
    markGenerationReady,
  );

  const beginGeneration = () => {
    performance.clearMarks("atlas:generation-start");
    performance.clearMeasures("atlas:generation");
    performance.clearMeasures("atlas:generation-failed");
    performance.mark("atlas:generation-start");
    pendingGenerationRef.current = "success";
    setGenerationError(undefined);
    setGenerationState("generating");
  };

  const submitCandidate = async (
    event: FormEvent<HTMLFormElement>,
    replacing: boolean,
  ) => {
    event.preventDefault();
    if (!runtime || generating || graphicsState !== "ready") return;

    const submitted = cloneCandidate(candidate);
    setCandidate(submitted);
    beginGeneration();
    setGenerating(true);
    setControlError(undefined);
    if (replacing) closeDialog(false, true);

    try {
      const view = await runtime.createMap(submitted.kind, submitted.settings);
      runtime.setPanTool(true);
      setPanSelected(true);
      setSession(view);
      setGenerating(false);
      setGenerationState("presenting");
      setGenerationError(undefined);
    } catch (reason: unknown) {
      pendingGenerationRef.current = "failure";
      setGenerating(false);
      setGenerationState("error");
      setGenerationError(
        `${reasonMessage(reason)} Retry with the same settings.`,
      );
      if (replacing) setDialogOpen(true);
    }
  };

  const openReplacement = () => {
    if (!session || generating) return;
    setCandidate({
      kind: session.metadata.kind,
      settings: { ...session.metadata.settings },
    });
    setGenerationError(undefined);
    setDialogOpen(true);
  };

  const togglePan = () => {
    if (!runtime || graphicsState !== "ready") return;
    const next = !panSelected;
    setPanSelected(next);
    runtime.setPanTool(next);
  };

  const retryRenderer = () => {
    setGraphicsError(undefined);
    setInitializationError(undefined);
    if (runtimeRef.current) {
      void runtimeRef.current.retryGraphics().catch(() => {});
      return;
    }
    setRuntimeAttempt((attempt) => attempt + 1);
  };

  const updateContours = async (enabled: boolean) => {
    if (!runtime || !session || contoursPending || graphicsState !== "ready") {
      return;
    }
    setContoursPending(true);
    setControlError(undefined);
    try {
      const view = await runtime.setContours(enabled);
      setSession(view);
    } catch (reason: unknown) {
      setControlError(
        `Contours could not be updated: ${reasonMessage(reason)}`,
      );
    } finally {
      setContoursPending(false);
    }
  };

  const showRendererStatus =
    graphicsState !== "ready" || Boolean(initializationError || graphicsError);
  const rootState = generating ? "generating" : generationState;
  const navigationDisabled = !runtime || graphicsState !== "ready";

  return (
    <main
      ref={editorRef}
      className="atlas-editor"
      data-generation-state={rootState}
      data-generation-kind={session?.metadata.kind ?? "none"}
      data-generation-seed={session?.metadata.effectiveSeed ?? ""}
    >
      <header className="editor-header">
        <div className="editor-brand">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>ATLAS</span>
        </div>
        <span className="editor-phase">Creator editor · in-memory session</span>
      </header>

      <div className="editor-intro">
        <div>
          <nav className="editor-breadcrumbs" aria-label="Breadcrumb">
            <span>Atlas</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Terrain editor</span>
          </nav>
          <h1>Terrain editor</h1>
          <p>Create or explore a private world in this browser.</p>
        </div>
        {session && (
          <button
            type="button"
            ref={openerRef}
            className="button button-secondary start-map-button"
            onClick={openReplacement}
            disabled={generating}
          >
            Start new Map
          </button>
        )}
      </div>

      {showRendererStatus && (
        <div
          className="editor-status"
          role={graphicsState === "failed" ? "alert" : "status"}
        >
          <span>
            {graphicsState === "recovering"
              ? "Preparing the map renderer…"
              : graphicsError ||
                initializationError ||
                "The map renderer needs attention."}
          </span>
          {graphicsState === "failed" && (
            <button
              type="button"
              className="button button-secondary"
              onClick={retryRenderer}
            >
              Retry renderer
            </button>
          )}
        </div>
      )}

      {!session && (
        <section className="creation-shell" aria-labelledby="creation-title">
          <div className="creation-copy">
            <span className="eyebrow">New editing session</span>
            <h2 id="creation-title">Create a terrain session</h2>
            <p>
              Start with a calm blank canvas or generate a repeatable world.
              This session stays in this browser. Refresh clears it.
            </p>
          </div>
          <CreationForm
            candidate={candidate.settings}
            kind={candidate.kind}
            onChange={setSettings}
            onKindChange={(kind) =>
              setCandidate((current) => ({ ...current, kind }))
            }
            onRandomSeed={handleRandomSeed}
            onSubmit={(event) => void submitCandidate(event, false)}
            submitLabel={
              generationError ? "Retry with these settings" : "Create Map"
            }
            idPrefix="initial"
            disabled={generating || !runtime || graphicsState !== "ready"}
            error={generationError}
          />
        </section>
      )}

      {generating && (
        <div className="editor-status generation-status" role="status">
          Creating Map…
        </div>
      )}

      <section
        className={`editor-workspace${session ? "" : " editor-workspace-pre-session"}`}
        aria-labelledby={session ? "map-title" : undefined}
      >
        {session && (
          <aside className="editor-inspector">
            <div className="inspector-heading">
              <span className="eyebrow">Editing session</span>
              <h2 id="map-title">Your Map</h2>
            </div>
            <dl className="session-meta">
              <div>
                <dt>Effective seed</dt>
                <dd>{session.metadata.effectiveSeed}</dd>
              </div>
              <div>
                <dt>Fixed sea level</dt>
                <dd>{session.metadata.settings.seaLevel}%</dd>
              </div>
              <div>
                <dt>Terrain</dt>
                <dd>
                  {session.metadata.kind === "blank" ? "Blank" : "Generated"}
                </dd>
              </div>
            </dl>
            <div className="tool-section">
              <span className="section-label">Navigation</span>
              <button
                type="button"
                className={`tool-button${panSelected ? " selected" : ""}`}
                aria-pressed={panSelected}
                aria-label="Pan"
                onClick={togglePan}
                disabled={navigationDisabled}
              >
                <span aria-hidden="true">✥</span> Pan
              </button>
              <div className="navigation-controls">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Zoom out"
                  onClick={() => runtime?.zoomOut()}
                  disabled={navigationDisabled}
                >
                  −
                </button>
                <button
                  type="button"
                  className="fit-button"
                  onClick={() => runtime?.fit()}
                  disabled={navigationDisabled}
                >
                  Fit map
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Zoom in"
                  onClick={() => runtime?.zoomIn()}
                  disabled={navigationDisabled}
                >
                  +
                </button>
              </div>
            </div>
            <div className="tool-section">
              <span className="section-label">Map display</span>
              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={session.contours}
                  onChange={(event) =>
                    void updateContours(event.target.checked)
                  }
                  disabled={contoursPending || graphicsState !== "ready"}
                />
                <span>Show contours</span>
              </label>
            </div>
            {controlError && (
              <p className="form-error" role="alert">
                {controlError}
              </p>
            )}
            <p className="inspector-note">
              Sea level is fixed after this session starts. To change it, start
              a new Map.
            </p>
          </aside>
        )}

        <div className="map-pane" aria-label="Terrain map">
          <div className="map-pane-header">
            <span>
              <span className="map-dot" /> Terrain canvas
            </span>
            <span className="map-dimensions">2048 × 1024</span>
          </div>
          <div
            ref={canvasHostRef}
            className="editor-canvas-host"
            aria-label="Terrain map canvas"
          />
          <div className="map-pane-footer">
            <span>
              {session
                ? panSelected
                  ? "Pan selected"
                  : "Pan off"
                : "Canvas ready"}
            </span>
            <span>
              {session
                ? "Session only · refresh clears this Map"
                : "Choose terrain above to begin"}
            </span>
          </div>
        </div>
      </section>

      {dialogOpen && session && (
        <div className={`dialog-backdrop${generating ? " generating" : ""}`}>
          <div
            ref={dialogRef}
            className="replacement-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="replacement-title"
            aria-describedby="replacement-warning"
            tabIndex={-1}
          >
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">Session replacement</span>
                <h2 id="replacement-title">
                  Discard session and start new Map
                </h2>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => closeDialog()}
                aria-label="Close dialog"
                disabled={generating}
              >
                ×
              </button>
            </div>
            <p id="replacement-warning" className="dialog-warning">
              This replaces the current in-memory session after the new terrain
              succeeds. Your current session remains available while it works;
              canceling or a failed creation keeps it intact.
            </p>
            <CreationForm
              candidate={candidate.settings}
              kind={candidate.kind}
              onChange={setSettings}
              onKindChange={(kind) =>
                setCandidate((current) => ({ ...current, kind }))
              }
              onRandomSeed={handleRandomSeed}
              onSubmit={(event) => void submitCandidate(event, true)}
              submitLabel={
                generationError
                  ? "Retry with these settings"
                  : "Discard current session & create Map"
              }
              idPrefix="replacement"
              disabled={generating}
              cancelLabel="Cancel"
              onCancel={() => closeDialog()}
              error={generationError}
            />
          </div>
        </div>
      )}
    </main>
  );
}
