import { Application, extend } from "@pixi/react";
import { Assets, Sprite, type Texture } from "pixi.js";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { type StaticMapManifest } from "@atlas/contracts";
import { loadStaticMapManifest } from "./mapManifest";
import "./styles.css";

extend({ Sprite });

const manifestUrl = "/maps/eldoria/manifest.json";

function App() {
  const [map, setMap] = useState<StaticMapManifest>();
  const [texture, setTexture] = useState<Texture>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    async function loadMap() {
      try {
        const manifest = await loadStaticMapManifest(manifestUrl);
        const loadedTexture = await Assets.load<Texture>(manifest.imageUrl);
        if (active) {
          setMap(manifest);
          setTexture(loadedTexture);
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Map could not be loaded.",
          );
        }
      }
    }

    void loadMap();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>ATLAS</span>
        </div>
        <span className="phase-label">Phase 0 · Read-only map preview</span>
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <span>Atlas</span>
            <span aria-hidden="true">/</span>
            <span className="current">Map preview</span>
          </nav>
          <h1 className="heading-title" id="page-title">
            {map?.title ?? "Loading map"} <span>/ Read-only preview</span>
          </h1>
          <p className="subheading">
            Static demo map. This Phase 0 preview is read-only.
          </p>
        </div>
      </section>

      <section className="map-shell" aria-label="Read-only map preview">
        <div className="map-toolbar">
          <div className="map-meta">
            <span className="map-dot" />
            <strong>{map?.title ?? "World map"}</strong>
            <small>
              • &nbsp;{map ? `${map.width} × ${map.height} px` : "Static map"}
            </small>
          </div>
          <div className="map-toolbar-right">
            <span className="read-only-tag">Static SVG</span>
          </div>
        </div>

        <div className="map-stage" aria-label="Static fantasy world map">
          {texture ? (
            <Application
              width={2048}
              height={1024}
              background="#17383c"
              antialias
            >
              <pixiSprite texture={texture} width={2048} height={1024} />
            </Application>
          ) : (
            <div
              className={`map-loader${error ? " error" : ""}`}
              role={error ? "alert" : "status"}
            >
              {error
                ? `Map unavailable: ${error}`
                : "Charting the known world…"}
            </div>
          )}
        </div>

        <footer className="map-footer">
          <div className="map-footer-group">
            <span>Image</span>
            <strong>SVG</strong>
            <span className="footer-divider" />
            <span>Dimensions</span>
            <strong>
              {map ? `${map.width} × ${map.height} px` : "2048 × 1024 px"}
            </strong>
          </div>
          <div className="map-footer-group">
            <span className="read-only-tag">Read only</span>
          </div>
        </footer>
      </section>

      <div className="bottom-note">
        <span>Static map fixture · Phase 0</span>
      </div>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing React root element.");

createRoot(rootElement).render(<App />);
