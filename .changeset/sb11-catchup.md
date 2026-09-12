---
"storybook-solidjs-vite": major
---

### Docgen server (Storybook 11)

- Add `experimental_docgenProvider` and `experimental_storyDocsProvider` so Controls, Docs, snippets, and the components manifest run on the Storybook server.
- **Remove** the Vite `__docgenInfo` preview inject and `experimental_enrichCsf` — docgen server is the only path (`features.experimentalDocgenServer` stays enabled from the preset).
- Resolve `meta.subcomponents` in the manifest.
- Pick the tsconfig (including project `references`) whose `fileNames` contain the source file.
- Recycle the TypeScript LanguageService when heap pressure hits 70% of the V8 limit.

### Testing

- `examples/lab` wires `@storybook/addon-vitest` (Playwright browser mode). New scenarios use CSF Next (`preview.meta()` + `meta.story().test()`); legacy CSF 3 scenarios remain for `badge` and `Counter` (`play`).
- CLI scaffold (`template/cli`) uses CSF Next with a `.test()` on every story; `experimentalTestSyntax` is on by default from the framework preset.
- Root scripts: `test:lab`, `check-docgen`.
- CI (`.github/workflows/ci.yml`): build, unit tests, lab docgen check, Vitest browser tests.

### Solid 2 default

- Default renderer is `solid2` (`preview-addon` → Solid 2 APIs). Solid 1 uses `solid1`; `STORYBOOK_ENV` / `parameters.renderer` are `'solid2'` / `'solid1'`. Dev dependency `solid-js-legacy` rewrites to `solid-js` in published output.
- Detect Solid major from the installed `solid-js` package (not peer dependency ranges), so bun and linked setups resolve Solid 2 correctly.
- `examples/lab` targets Solid 2 (`solid-js@^2`, `@solidjs/vite-plugin@3`).
- `examples/solid1` is the Solid 1 crutch on Storybook 11 (`solid-js@1` + `vite-plugin-solid@2`).

### Storybook 11 peers

- Peer `storybook` is `^11.0.0` only (including 11 prereleases). Vite peer is `^6.3 || ^7 || ^8`.
- CLI template stories import `.storybook/preview` (CSF Next). Register `@storybook/addon-docs` via `definePreview` in that file.

### Breaking

- Remove `storybook-solidjs-vite/experimental-playwright` (`createPlaywrightTest` is gone in Storybook 10.6). Use `@storybook/addon-vitest`.
- Stop auto-injecting the Solid Vite plugin. Add it in `vite.config.ts` yourself — Storybook 8+ already stopped doing this for other frameworks. Solid 2 uses `@solidjs/vite-plugin`; Solid 1 stays on `vite-plugin-solid@^2`.
- Remove preview `__docgenInfo` injection and `experimental_enrichCsf`; Autodocs snippets and Controls come from the docgen server only.
- Remove dead portable-story rendering paths (`__isPortableStory`) from the renderer.
