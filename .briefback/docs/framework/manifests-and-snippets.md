# Manifests and snippets

Components manifest generation and Autodocs “Show code” snippets.

See also: [modules index](./modules.md), [docgen](./docgen.md).

## Components manifest

`generateComponentManifests` (`src/internal/componentManifest/manifests.ts`), exported as `experimental_manifests`:

- **Default (`experimentalDocgenServer` off):** resolve CSF → extract component-meta in batch → build a `v: 0` components map with stories, snippets, and `reactComponentMeta`.
- **Docgen server on:** return an empty `components` map and keep `meta.docgen: 'react-component-meta'`. Storybook core then builds the ref-based `v: 1` manifest from docgen / story-docs snapshots.

Engine id reported to the UI is `react-component-meta` (`MANIFEST_DOCGEN_ENGINE`) even though the internal engine name is `solid-component-meta`.

## Autodocs snippets

With `experimentalCodeExamples` (on by default):

- Index-time: `experimental_enrichCsf` can inject snippets into story parameters.
- Docgen-server path: `experimental_storyDocsProvider` builds per-story snippets from CSF via `getCodeSnippet` (merge meta/story `args` into JSX, or inline into a custom render).

`getCodeSnippet` lives in `src/internal/codeExamples/generateCodeSnippet.ts`.

## Key modules and tests

- `src/internal/componentManifest/manifests.ts`
- `src/internal/codeExamples/enrichCsf.ts`
- `src/internal/codeExamples/generateCodeSnippet.ts`
- `src/internal/componentManifest/docgen/storyDocsProvider.ts`
- `src/spec/componentManifest/manifests.test.ts`
- `src/spec/codeExamples/**`
