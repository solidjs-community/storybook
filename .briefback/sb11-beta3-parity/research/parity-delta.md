# React parity delta at Storybook 11.0.0-beta.3

## Summary

Snapshot 2026-11-17. This page diffs `.briefback/docs/framework/react-parity.md` (written at beta.0, 2026-11-05) against `v11.0.0-beta.3`. Evidence is in [React changes](./react-changes-beta0-beta3.md), [agent docgen across frameworks](./agent-docgen-frameworks.md) and [naming](./naming-csf4.md).

One real feature gap opened: **live snippets** (story-docs `template` + preview `printHole`). The rest are small fixes, a rename, and an upstream `create-storybook` flip. CSF 4 types and portable stories did not change upstream, so those rows stay at parity.

## Prioritized gaps

| # | Gap | Why | Size | Touches |
| --- | --- | --- | --- | --- |
| G1 | **Live snippets.** `getCodeSnippet` should also return a `template` (`SnippetTemplate<SolidHolePlace>`). The story-docs provider should put it on each `StoryDoc`, and `renderer/docs.ts` should set `parameters.docs.source.printHole` when `globalThis.FEATURES?.docgenServer`. | React, Vue, Svelte, WC and Angular-vite all ship it (#37170). Core drops templates unless `features.experimentalLiveServerSnippets` is on (default off), so emitting them always is safe. Without them, the Code panel, Show code and `<Source>` keep the static snippet and add the warning "The snippet does not follow the changed args." once a control changes, because the story has a `snippet` but no `template` (`live-snippet.ts:NOT_FOLLOWING`). | **M** | `src/internal/codeExamples/generateCodeSnippet.ts` (print once with `createHoleMarks(sources, m => '/*'+m+'*/')`, `toTemplate`, `withHoleSpace(kind==='attr')`, `stripHoles`). New shared `snippet-values.ts`: port React's `printAttribute` / `printAttributes` / `printChildren`; Solid JSX has the same attribute grammar, and `use:` / `on:` names pass React's `isAttributeName` regex. New `printHole` (port React's `docs/print-hole.ts`, using core `printValue`). `storyDocsProvider.ts:buildStoryDocs` adds `template` only when `codeExamples` is on. Tests: port the template cases from React's `generateCodeSnippet.test.tsx` (+418 lines). Lab: set `experimentalLiveServerSnippets: true` in `examples/lab/.storybook/main.ts` to check it by hand. **Needs a peer floor of `11.0.0-beta.2`**: `snippetTemplate.ts` / `snippetValues.ts` are absent at beta.1 and present at beta.2 (`git ls-tree`). |
| G2 | **`create-storybook` CSF 4 for Solid (upstream).** `supportsCsfFactories(SupportedFramework.SOLID)` returns `false`, with the comment "already ships definePreview; blocked on exporting defineMain from ./node". | Our `next` exports `./node` with `defineMain`, root `definePreview` accepts the `addons: []` that the CSF 4 preview template writes, and our `template/cli` is already CSF 4. Until upstream flips it, `create-storybook --type=solid` writes a CSF 3 `preview` and `main` next to `preview.meta()` stories, and `MIGRATION.md:48` overstates what happens. Flip it in `code/lib/create-storybook/src/generators/csf-factories.ts` once an 11.x `storybook-solidjs-vite` with `./node` is published. The other research agent owns create-storybook detail. | **S** (upstream PR) | upstream only; then correct `MIGRATION.md:48` |
| G3 | **`internal_getArgTypesData` builds a cold manager per call.** | React (#37141) uses `getSharedComponentMetaManager()`, one warm process-wide manager, for ghost stories under `docgenServer`. Ours does `new SolidComponentMetaManager(ts)` … `dispose()` on every call (`src/internal/componentManifest/manifests.ts:getArgTypesData`), so each addon-vitest ghost-story call rebuilds a TS program. `getOrCreateSolidComponentMetaManager` (`SolidComponentMetaManager.ts:152`) already exists and has no callers. | **S** | `manifests.ts`, `SolidComponentMetaManager.ts` |
| G4 | **`experimental_manifests` ignores `docgenServer`.** | Vue/Svelte/WC return `existingManifests` when `features.docgenServer` is off. Ours always returns `{ components: {}, meta: { docgen } }`, so `framework.options.docgen: false` still advertises an engine. | **S** | `src/internal/componentManifest/manifests.ts:generateComponentManifests` (+ `manifests.test.ts`) |
| G5 | **Engine id and comment.** | Core does not need `react-component-meta`. Other renderers report their own ids, and the agent formatter keys on payload fields (`reactComponentMeta`), not on the id. Report `DOCGEN_ENGINE` (`'solid-component-meta'`) and fix the comment at `SolidComponentMetaManager.ts:172`. `ComponentsManifest['meta']['docgen']` is a closed union, so this needs a cast, or an upstream PR adding `'solid-component-meta'`. Keep the `reactComponentMeta` payload field: that is what feeds MCP props. | **S** | `SolidComponentMetaManager.ts`, `manifests.ts`, `manifests.test.ts`, `.briefback/docs/framework/manifests-and-snippets.md` |
| G6 | **Rename "CSF Next" → "CSF 4"** in prose, tests, fixtures and internal identifiers. | Upstream docs and blog say "CSF 4". The full inventory is in [naming](./naming-csf4.md). No public export changes. | **S** (mechanical, ~45 sites) | README, MIGRATION, TESTING (user's uncommitted files), AGENTS.md, `.changeset/*`, `.briefback/docs/framework/*`, `examples/lab/README.md`, `src/**` |
| G7 | Optional: `renderer: 'solid'` and/or `apiDescription` on docgen payloads. | Vue/Svelte/WC/Angular set them and React does not. `renderer` only adds a badge in the components debugger. `apiDescription` would replace the props section in MCP markdown. This is not a React-parity item. | S (`renderer`) / M (`apiDescription`) | `docgen-worker.ts:docPayload` |

## Rows of `react-parity.md` that change

### At parity

| Row | Change at beta.3 |
| --- | --- |
| Story file reading | Still at parity. The `csf-tools` exports we import all exist at beta.3. The CSF factory helpers moved to `estree/ast.ts` and are re-exported. |
| **Code snippets** | **No longer at parity.** React's `getCodeSnippet` returns `{ snippet, template, … }` (G1). |
| **Story docs payload** | **Add the missing field `template`** (G1). `import`, `summary`, `description` and `warning` are unchanged. |
| Component docgen payload | Unchanged in React (`buildReactComponentDocgen.ts` only has type-import edits). Core's `DocgenPayload` has optional `apiDescription` / `renderer`, which React does not set (G7). |
| Component meta base | Still at parity. React's `ComponentMetaProject` still extends core `ProgramBackedProject`, now over a `DocgenTypeScript` contract. Core `getOrCreateConfiguredProject` is still private and present. |
| **`internal_getArgTypesData`** | React now uses its server engine when `docgenServer` is on, through a shared manager. Ours: same engine, but cold per call (G3). Update the row text. |
| CSF Next types | Rename the row to **CSF 4 types**. No upstream diff in `preview.tsx` or `csf-factories.ts`, so it stays at parity. |
| Portable stories | Unchanged upstream. |
| `main.ts` entry | Unchanged. `react-vite` `exports` did not change. |
| `.test()` without `experimentalTestSyntax` | Unchanged. |
| **Template stories (new row)** | **Move here from Deliberate differences.** React `template/cli` is CSF 4 (`preview.meta` / `meta.story`) since #37125, which is what ours already are. React also added `template/.storybook/preview.ts` (`__definePreview({ addons: [] })`) as a typecheck target for the templates. |

### Deliberate differences

| Row | Change |
| --- | --- |
| **`template/cli` stories are CSF Next / React CSF 3** | **Remove.** Both are CSF 4 now. What remains is a **gap**: `create-storybook` still scaffolds a CSF 3 preview for Solid (G2). |
| Bundled `@typescript/typescript6` | Still valid. Update the React column: React now loads TS 5.9/6 through the compiler API or **TS 7.1 through the native API** (`@storybook/component-meta-typescript`, private and bundled), and honors `typescript.docgenSpecifier`. The reason ("docgen never loads the user's TypeScript") still holds. `docgenSpecifier` does not apply to us. |
| `experimentalCodeExamples: false` drops snippets | Still a difference. React's story-docs preset still ignores the flag. Under G1, templates must follow the flag (no snippet → no template). |
| Our tsconfig lookup via private `getOrCreateConfiguredProject` | Still needed and present (`ComponentMetaManager.ts:301`). |
| No `optimizeViteDeps` | Unchanged. |
| Renderer split by Solid major; N/A act / StrictMode / RSC / `jsxDecorator` | Unchanged. React's #36754 `act` event wrapper is N/A. |

### Known gaps

- Solid 1 portable stories in plain Vitest: unchanged.
- **Story docs `import` field**: core's story-docs README at beta.3 still documents `import` per file (and per-snippet/template for multi-file components), and React still sets it. Keep it.
- Lint `.ts`: unchanged.
- **New**: G1–G5 above.

### "Next Storybook update" paths to add

- `code/core/src/docs-tools/{snippetTemplate,snippetValues}.ts`
- `code/renderers/react/src/{snippet-values.ts,docs/print-hole.ts,entry-preview-docs.ts,docgen/extractArgTypesFromComponentFile.ts,componentManifest/componentMetaManagerSingleton.ts}`
- `code/core/src/shared/open-service/services/story-docs/{live-snippet,server}.ts`
- `code/lib/create-storybook/src/generators/csf-factories.ts` (`supportsCsfFactories`)
- `code/core/src/types/modules/core-common.ts` (`StorybookFeatures`, `ComponentsManifest.meta.docgen`)

## Items now resolvable

- The **deliberate difference "template/cli stories are CSF Next"** can be closed. Its condition ("until Storybook moves React templates … to CSF Next") is met for React. The create-storybook half is now G2.
- **Engine id**: the beta.0 note "Engine id reported to the UI is `react-component-meta`" can become `solid-component-meta`, because core has no hard dependency on the React id (G5).
- **Peer floor**: stays `^11.0.0-beta.0` unless G1 lands. G1 needs `>=11.0.0-beta.2` (first release with `storybook/internal/docs-tools` `createHoleMarks`, `stripHoles`, `withHoleSpace`, `printValue`, and the `StoryDoc.template` type), or a local copy of those helpers.

## Sources

- `/tmp/sb-research/sb` at `v11.0.0-beta.0`, `v11.0.0-beta.1`, `v11.0.0-beta.2`, `v11.0.0-beta.3` (`git log`, `git diff`, `git ls-tree`), read 2026-11-17.
- https://storybook.js.org/blog/storybook-11-beta/ (2026-11-09; read 2026-11-17).
- Our `.briefback/docs/framework/react-parity.md` (snapshot beta.0, 2026-11-05).

## Open questions

- Should G1 bump the peer floor to `^11.0.0-beta.2`, or vendor the hole-mark helpers? The trial-upgrade agent's findings should decide.
- Does the user want the honest engine id (G5) even though it needs a cast against core's closed union?

## Assumptions and limits

- Sizes are estimates from React's diff size (`generateCodeSnippet.ts` 254 lines changed, `snippet-values.ts` 78, `print-hole.ts` 43, tests +418) and from how closely our generator mirrors React's (`generateCodeSnippet.ts`: 424 lines vs React's 489).
- Nothing was built or run against beta.3. Whether our preset loads on beta.3 belongs to the trial-upgrade agent.
