# Atlas frontend guidance

- Follow the root `AGENTS.md` and `docs/agents/private-pilot-scope.md` for current feature boundaries. The pilot editor covers generated terrain, three Terrain Property Brushes, Freehand Drawing, basic road/river Feature Strokes, and session undo/redo. The Explorer opens one Public Published Version and pans/zooms; stamps, Lore, search, and mobile-first editing are deferred.

- This app uses React 19, PixiJS 8, and `@pixi/react` v8. Render Pixi display objects through prefixed JSX elements such as `<pixiSprite>`.
- Static map data must pass through `@atlas/contracts`'s `parseStaticMapManifest` before use.
- Keep map fixtures and public assets under `public/maps/`; keep focused frontend tests under `test/`.
- Browser smoke coverage lives in `browser/` and uses Playwright Chromium; install its browser with `npx playwright install chromium` when setting up locally.
- Run frontend commands from `atlas/`. Root workspace builds contracts before this app.
