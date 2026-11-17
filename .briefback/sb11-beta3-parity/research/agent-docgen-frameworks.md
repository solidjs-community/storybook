# Agent-ready docgen across core frameworks (Storybook 11.0.0-beta.3)

## Summary

Snapshot 2026-11-17 of the `v11.0.0-beta.3` source. The beta blog lists "agent-ready docgen for all core frameworks" (React, Vue, Angular, Web Components, Svelte). On disk that means every core renderer ships the same three pieces, and Solid already has them:

1. A **docgen worker** registered through `experimental_docgenProvider`.
2. A **story-docs provider** (`experimental_storyDocsProvider`) that serves snippets, descriptions and the import block.
3. An **`experimental_manifests` stub** that names the engine (`meta.docgen`). Core builds the ref-based components manifest and the MCP markdown from the docgen and story-docs services.

Two things the non-React renderers all do that Solid does not:

- **Live snippets.** Each of Vue, Svelte, WC (and React, Angular-vite) emits `StoryDoc.template` and sets `parameters.docs.source.printHole`. See [React changes](./react-changes-beta0-beta3.md) and [parity delta](./parity-delta.md) G1.
- **`apiDescription` + `renderer`** in the docgen payload. Vue, Svelte, WC and Angular-vite write a Markdown API section (`## Props`, `Events`, `Slots`) and a renderer id. React writes neither and relies on `reactComponentMeta`. Solid copies React (`reactComponentMeta`), which the agent formatter reads. This is a choice, not a gap; it is optional work (G6).

No new preset hook was added between beta.0 and beta.3. A diff of every renderer and framework `preset.ts` shows only React's `isDocgenProviderEnabled` becoming async. Core reads no new preset keys from renderers.

**Engine id.** Core does **not** need `react-component-meta`. Each renderer reports its own: `vue-component-meta`, `svelte2tsx`, `custom-elements-manifest`. `meta.docgen` is only shown in the components HTML debugger ("Using `<id>`"), and gets a tip box only when it equals `react-docgen` / `react-docgen-typescript`. The agent markdown formatter chooses props by **payload field** (`apiDescription`, else `reactDocgen` / `reactDocgenTypescript` / `reactComponentMeta`), never by engine id. So our comment "Storybook core manifest UI expects `react-component-meta`" (`SolidComponentMetaManager.ts:172`) is wrong at beta.3. `ComponentsManifest['meta']['docgen']` in `core-common.ts` is a closed union with no Solid member, so `'solid-component-meta'` needs a cast, or an upstream PR to add it.

## How each framework wires it

| | Vue 3 (`renderers/vue3`) | Svelte (`renderers/svelte`, `frameworks/svelte-vite`) | Web Components (`renderers/web-components`) | React (`renderers/react`) | **Solid (ours)** |
| --- | --- | --- | --- | --- | --- |
| Worker entry | `./internal/docgen-worker` (`DOCGEN_WORKER_SPECIFIER`, exported for third-party frameworks such as rsbuild) | `./internal/docgen-worker` | `./internal/docgen-worker` | `./internal/docgen-worker` | `./internal/docgen-worker` (`src/internal/componentManifest/docgen/docgen-worker.ts`) |
| `experimental_docgenProvider` options | none | none | `{ manifestPaths, previewFilePath }` | `{ typeScriptSpecifier }` (new at beta.3) | none (`src/internal/componentManifest/docgen/docgenProvider.ts`) |
| Engine | `VueComponentMetaManager extends ComponentMetaManager` (core) on vue-component-meta | `SvelteComponentMetaManager extends ComponentMetaManager` on svelte2tsx | CEM file, or `GeneratorManager extends ComponentMetaManager` | React `ComponentMetaProject extends ProgramBackedProject`, TS 6 or 7.1 native | `SolidComponentMetaManager extends ComponentMetaManager`, `SolidComponentMetaProject extends ProgramBackedProject`, bundled TS 6 |
| Worker calls `manager.startWatching()` | yes (`docgen-worker.ts:32`) | yes (`docgen-worker.ts:22`) | yes (`source-manager.ts:90`) | no (only `componentManifest/generator.ts:135`) | no (same as React) |
| Story-docs provider | `createWorkerGatedStoryDocsProvider` (core) | same, with `SVELTE_DOCGEN_STORY_FILE_TEST_REGEXP` | same | own preset (`docgen/story-docs-preset.ts`), no worker gate | own preset (`storyDocsProvider.ts`), no worker gate, like React |
| `template` + `printHole` (live snippets) | yes: `docs/print-hole.ts`, `snippet-values.ts`, `entry-preview-docs.ts` | yes | yes (`snippet-holes.ts`) | yes | **no** |
| `experimental_manifests` `meta.docgen` | `vue-component-meta` | `svelte2tsx` | `custom-elements-manifest` | `react-component-meta` | `react-component-meta` (`MANIFEST_DOCGEN_ENGINE`) |
| Manifests stub when `docgenServer` is off | returns `existingManifests` | returns `existingManifests` | returns `existingManifests` (also needs `componentsManifest`) | legacy generator | **always returns the stub** (`src/internal/componentManifest/manifests.ts:generateComponentManifests`) |
| Payload `apiDescription` | `buildApiDescription(componentMeta)` | `buildApiDescription(name, docgen)`: props, events, slots; long DOM attribute sets summarized as `extends HTMLInputAttributes` | `buildApiDescription(declaration)` | — | — |
| Payload `renderer` | `'vue3'` | `'svelte'` | `'web-components'` | — | — |
| Engine-specific props field | — | — | — | `reactComponentMeta` | `reactComponentMeta` (raw `SolidComponentDoc`) |
| `isDocgenProviderEnabled` | `isTypeScriptReadyForDocgen` | same | CEM present, or TS ready | TS ready (API list) or `react-docgen` fallback | `options.docgen !== false` (TS is bundled) |
| `features` default | `componentsManifest: true` (renderer preset) | same | — | same | framework preset: `componentsManifest`, `experimentalCodeExamples`, `experimentalTestSyntax`, `docgenServer` |
| docs preview annotations | `entry-preview-docs` only when the docs addon is present | same | same | same | `renderer/docs` always (`src/renderer/index.ts:previewAnnotations`) |

## How core consumes it

- `core/src/core-server/utils/manifests/manifests.ts:resolveDocgenMeta`: an invariant requires `components.meta.docgen` from `experimental_manifests` when `docgenServer` is on. The value is copied through unchanged.
- `core/src/core-server/utils/manifests/render-components-manifest.ts`: `activeEngine` is display text. Line 1032 shows `c.renderer` as a badge when present.
- `core/src/shared/open-service/toolsets/docs/manifest-formatter/markdown.ts`: `getParsedDocgen` prefers `reactDocgen` → `reactDocgenTypescript` → `reactComponentMeta`. An `apiDescription` replaces the props section, and subcomponents get the same treatment. `adapt-core-manifest.ts` drops `argTypes` and passes engine fields through. This is why our `reactComponentMeta` field matters for MCP output.

## What Solid lacks (beyond React parity)

1. Live-snippet `template` + `printHole` (all five core renderers have it). Size M. See parity delta G1.
2. `experimental_manifests` should return `existingManifests` when `features.docgenServer` is false, as Vue/Svelte/WC do. Today `docgen: false` still advertises an engine and an empty component map. Size S.
3. An honest engine id (`'solid-component-meta'`, already defined as `DOCGEN_ENGINE`), plus a fix to the misleading comment. Size S, with a type cast or an upstream union PR.
4. Optional: `renderer: 'solid'` on docgen payloads (badge only). An `apiDescription` could express Solid-specific facts (`extends JSX.HTMLAttributes<…>`, `children`, directives) the way Svelte summarizes DOM attributes. Size M, and not needed for parity with React.
5. Watching: Vue/Svelte/WC call `startWatching()` in the worker; React and we do not. Core's `subscribeDocgenToModuleGraphChanges` re-extracts on module-graph changes, but whether a type change in an unimported `.d.ts` reaches a non-watching manager was **not verified**. Open question.

## Relevant files and modules

- Upstream: `code/renderers/{vue3,svelte,web-components}/src/{preset.ts,docgen/preset.ts,docgen/story-docs-provider.ts|story-docs-preset.ts,docgen/docgen-worker.ts,entry-preview-docs.ts,docs/print-hole.ts,snippet-values.ts}`
- Upstream core: `code/core/src/shared/open-service/services/story-docs/provider.ts` (`createWorkerGatedStoryDocsProvider`), `code/core/src/shared/open-service/services/docgen/types.ts` (`DocgenPayload.apiDescription`, `.renderer`), `code/core/src/types/modules/core-common.ts:ComponentsManifest`
- Ours: `src/renderer/index.ts`, `src/internal/componentManifest/manifests.ts`, `src/internal/componentManifest/solidComponentMeta/SolidComponentMetaManager.ts` (`DOCGEN_ENGINE`, `MANIFEST_DOCGEN_ENGINE`), `src/internal/componentManifest/docgen/*`

## Constraints

- If we adopt `createWorkerGatedStoryDocsProvider`, it would skip story docs whenever our worker is not registered. That is already true in practice, because core only calls story docs under `docgenServer`. It would also change our "spread ours over downstream" semantics only slightly: on an error it hands off to `next` instead of returning the downstream payload. Not required for parity, since React does not use it either.
- `features.experimentalCodeExamples: false` → no snippets is our deliberate difference. Templates must follow it: no snippet, no template.

## Sources

- `/tmp/sb-research/sb` at `v11.0.0-beta.3`, read 2026-11-17.
- https://storybook.js.org/blog/storybook-11-beta/ (2026-11-09, read 2026-11-17).

## Open questions

- Should Solid ship `apiDescription`? The formatter output for `reactComponentMeta` was not compared side by side with Svelte's `apiDescription` on a lab component.
- Does the docgen worker pick up edits to a component's imported types without `startWatching()`? Not run.

## Assumptions and limits

- Angular-vite and `angular-cm` were only grepped (they emit `apiDescription` and have `print-hole.ts`), not read.
- MCP/agent toolsets beyond the manifest formatter belong to the other research agent.
