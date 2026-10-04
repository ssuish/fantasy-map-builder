# Atlas frontend

Follow root instructions. Product behavior belongs to `docs/product-spec.md`; terrain/viewport interfaces and measurement belong to `docs/technical-design.md`.

- For PixiJS changes start with `.agents/skills/pixijs/SKILL.md`; use relevant routed skills. React controls and coarse state stay separate from high-frequency Pixi viewport work.
- This app uses prefixed Pixi JSX such as `<pixiSprite>`. Static demo manifests must pass `@atlas/contracts`'s `parseStaticMapManifest`; they are not editable documents.
- Keep public fixtures under `public/maps/` and focused frontend tests under `test/`. Inspect package scripts and browser configuration for current commands; use root workspace commands.
- Test rendered interactions through the frontend browser workflow. Software-rendered smoke is correctness evidence, not hardware performance acceptance.
