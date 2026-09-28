# Atlas frontend guidance

- This app uses React 19, PixiJS 8, and `@pixi/react` v8. Render Pixi display objects through prefixed JSX elements such as `<pixiSprite>`.
- Static map data must pass through `@atlas/contracts`'s `parseStaticMapManifest` before use.
- Keep map fixtures and public assets under `public/maps/`; keep focused frontend tests under `test/`.
- Browser smoke coverage lives in `browser/` and uses Playwright Chromium; install its browser with `npx playwright install chromium` when setting up locally.
- Run frontend commands from `atlas/`. Root workspace builds contracts before this app.
