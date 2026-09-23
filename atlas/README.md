# Atlas frontend

The Atlas frontend is a React 19 and PixiJS 8 read-only Phase 0 map preview built with Vite. It reads a static map manifest, validates it with the shared `@atlas/contracts` package, then loads the declared image as a Pixi texture. Editing, publishing, and collaboration are outside this phase.

## Development

From the repository root, run `npm run dev:web`. From this directory, run `npm run dev`.

The demo manifest and its 2048 × 1024 map are in `public/maps/eldoria/`. Build and lint with `npm run build`; run the manifest loader tests with `npm test`.

Run the browser smoke check with `npm run test:browser`. On a new machine, install the browser once with `npx playwright install chromium` (CI should install Chromium before invoking this script).
