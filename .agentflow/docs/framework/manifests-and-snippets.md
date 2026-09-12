# Manifests and snippets

Components manifest generation and Autodocs “Show code” snippets.

See also: [modules index](./modules.md), [docgen](./docgen.md).

## Components manifest

With `experimentalDocgenServer` on (default), `generateComponentManifests` returns an empty `components` map and keeps `meta.docgen: 'react-component-meta'`. Storybook core builds the ref-based `v: 1` manifest from docgen / story-docs snapshots.

Engine id reported to the UI is `react-component-meta` (`MANIFEST_DOCGEN_ENGINE`); internal name is `solid-component-meta`.

## Autodocs snippets

With `experimentalCodeExamples` (on by default), `experimental_storyDocsProvider` builds per-story snippets from CSF via `getCodeSnippet` (merge meta/story `args` into JSX, or inline into a custom render).

## Key modules and tests

- `src/internal/componentManifest/manifests.ts`
- `src/internal/codeExamples/generateCodeSnippet.ts`
- `src/internal/componentManifest/docgen/storyDocsProvider.ts`
- `src/spec/componentManifest/manifests.test.ts`
- `src/spec/codeExamples/**`
