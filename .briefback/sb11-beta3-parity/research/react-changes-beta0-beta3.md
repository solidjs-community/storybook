# React changes, Storybook 11.0.0-beta.0 → 11.0.0-beta.3

## Summary

Snapshot 2026-11-17, from a clone of `storybookjs/storybook` at tag `v11.0.0-beta.3` (released 2026-11-13).
Command: `git log --no-merges v11.0.0-beta.0..v11.0.0-beta.3 -- code/renderers/react code/frameworks/react-vite` (58 commits, 9 PRs), plus `git diff` of the core paths React depends on.

What matters for Solid:

1. **Live snippets (#37170, first shipped in `11.0.0-beta.2`)** are the only large new feature that applies to us. Every core renderer (React, Vue 3, Svelte, Web Components, Angular-vite) now returns a `template` for each story in story docs and sets `parameters.docs.source.printHole`. Solid has neither. See [parity delta](./parity-delta.md) G1.
2. **CLI templates moved to CSF 4 (#37125).** React's `template/cli` stories now use `preview.meta()` / `meta.story()`. Ours already did, so the "template/cli stories are CSF Next vs React CSF 3" difference is gone. `create-storybook` still returns `false` for `SupportedFramework.SOLID` in `supportsCsfFactories`. Its stated reason is "blocked on exporting defineMain from ./node", and our `next` branch now exports that.
3. **`internal_getArgTypesData` (#37141)** now uses React's server engine (component-meta) when `docgenServer` is on, through a **process-shared** manager. We already use our engine, but we build and dispose a new manager on every call (G3).
4. **No CSF 4 type changes.** `code/renderers/react/src/preview.tsx`, `portable-stories.tsx`, `public-types.ts` and `code/core/src/csf/csf-factories.ts` have no diff. Core `csf/` only gained `isValidPreviewPath` in `csf-utils.ts`, moved out of `CsfFile.ts`, where it is still re-exported.
5. Most of the rest is React-only: TypeScript 7.1 native API for docgen, optional `react-docgen*` peers, `act` event wrapper, escodegen default formatting.

## Commit / PR list

`Applies?`: Y = the feature applies to Solid; N/A = React-only or a builder-docgen path we do not have. `Ours` cites the file:symbol when we already have it.

| PR | What changed (React paths) | Applies? | Ours |
| --- | --- | --- | --- |
| #37170 `kasper/live-snippets-6-angular` (whole stacked series; 12 React commits: `3a7815d804` "Story snippets follow the controls", `6513d72fa0`, `78eb76774b`, `924088ea0b`, `5c45df1c55`, `96c84fdcec`, `14b4e0ddc3`, `3eda2b858c`, `0f48b1321f`, `6629943280`, `4d15fb4b63`, `f05fdb80eb`) | `getCodeSnippet` now returns `{ snippet, template, imports, unresolved }` (was `code`). The snippet is printed once with hole marks (`createHoleMarks` with `/*…*/` wrap), converted with `toTemplate`, `withHoleSpace(kind==='attr')`, `stripHoles` → snippet. New `src/snippet-values.ts` (`ReactHolePlace` = `attr`/`text`/`value`/`attrs`; `printAttribute`, `printAttributes`, `printChildren`) is shared by provider and preview. New `src/docs/print-hole.ts` (`printHole`). `entry-preview-docs.ts` sets `parameters.docs.source.printHole` when `FEATURES.docgenServer`. `buildStoryDocsFromResolved({ withTemplate })`, and `docgen/build-story-docs.ts` passes `withTemplate: true`. `extractStorySnippets` now returns core `StoryDoc[]` (the `ResolvedStory` type is removed). | **Y** | **Missing.** `src/internal/codeExamples/generateCodeSnippet.ts:getCodeSnippet` returns `code` only. `src/internal/componentManifest/docgen/storyDocsProvider.ts:buildStoryDocs` sets no `template`. `src/renderer/docs.ts:parameters` has no `docs.source.printHole`. |
| #37125 `norbert/csf4-init-templates` (`ef1a365bed`, `655168e849`, `fdeb5b0695`, `2bb4fca205`) | `renderers/react/template/cli/{js,ts}/*.stories.*` and `frameworks/react-vite/template/cli/*` now use `import preview from '../../.storybook/preview'` with `preview.meta({...})` / `meta.story({...})`. New `renderers/react/template/.storybook/preview.ts` (`__definePreview({ addons: [] })`), used only as a typecheck target. `create-storybook` `supportsCsfFactories()` returns true for React/Vue/Svelte/WC/Angular/Astro and **false for SOLID** ("already ships definePreview; blocked on exporting defineMain from ./node"). | Y | Templates are already CSF 4: `template/cli/ts/Button.stories.ts` imports `../../.storybook/preview`. `./node` with `defineMain` exists (`src/node.ts`, `package.json` `exports["./node"]`). The upstream enum flip is still needed. |
| #37141 `kasper/optional-react-docgen-peers` (`8c28868625`, `1fc756b91f`, `af2ce3dc52`, `340992c39a`, `3a76c4a447`, `1b87a07bb3`, `e92fbd1bff`, `f255c24003`, `f7d6a42c30`) | `react-docgen`, `react-docgen-typescript` and the Vite docgen plugin become optional peers. New `builder-docgen.ts` + `./internal/builder-docgen` export. `isDocgenProviderEnabled` checks TypeScript readiness against `REACT_DOCGEN_TYPESCRIPT_APIS` with a `react-docgen` fallback. **`internal_getArgTypesData` runs `docgen/extractArgTypesFromComponentFile.ts` (component-meta, shared manager `getSharedComponentMetaManager`) when `features.docgenServer`** ("ghost stories" for addon-vitest). | Partly: builder docgen N/A; the getArgTypesData engine is Y | Engine: we already have it (`src/internal/componentManifest/manifests.ts:getArgTypesData` uses `SolidComponentMetaManager`). **Gap:** `new SolidComponentMetaManager(ts)` + `dispose()` on every call; React keeps one warm manager. `getOrCreateSolidComponentMetaManager` in `SolidComponentMetaManager.ts` exists but has no callers. |
| #37004 `jeppe/ts71-native-docgen` (`59eeca6c16`, `db78769e02`, `d8110ba15b`, `88bd0da8d2`, `c6e995a274`, `8bf24ad089`, `f6979ed6c5`, `d0ccd6ec63`, `4d80e412e0`, `b23432459c`, `9bcae6a056`, `9eac8acc80`, `ab4abdf7a2`) | React component-meta extractor written against a `DocgenTypeScript` contract. New private package `code/lib/component-meta-typescript` (bundled, `"private": true`): TypeScript 5.9/6 compiler API or the TS 7.1 native API (`typescript/sync`) facade. New `typescript.docgenSpecifier` option (`TypescriptOptions` in `core-common.ts`), passed to the worker as `DocgenProviderDescriptor.options.typeScriptSpecifier` via `getTypeScriptSpecifierForDocgen`. Core `component-meta/index.ts` now exports type `ProjectCommandLine`. | N/A by design | We bundle `@typescript/typescript6` (deliberate difference in `react-parity.md`). `docgenSpecifier` only helps engines that load the user's TypeScript. Core `ComponentMetaManager.getOrCreateConfiguredProject` is still private and present at beta.3 (`core/src/component-meta/ComponentMetaManager.ts:301`), so our hook still works. |
| #37320 `jeppe/react-compact-array-default` (`256bbfc771`, `e03bb42d86`) | `docs/lib/generateCode.ts`: compact array/object defaults print with one space (escodegen padding fix). | N/A | Builder docgen (react-docgen / propTypes) only. Our defaults come from component-meta text. |
| #37292 `kasper/docgen-plugin-peer-0.7` (`99960f7658`, `54353374e8`) | Pins `@joshwooding/vite-plugin-react-docgen-typescript` to 0.7. | N/A | — |
| #36754 `smg99/fix/issue-36738-react-eventwrapper` (`e0486c32b3`, `413de4cce0`, `b069387a3c`, `88e7ffd98f`, `80c04b34d2`, `4aad49e777`) | `act-compat.ts:createEventWrapper`: re-entrant `act` event wrapper for `storybook/test`. | N/A | No `act` in Solid. Our `src/renderer/shared/before-all.ts` wraps async steps with a macrotask instead. |
| #37195 separator-agnostic alias test (`6bf66e44c0`, `3c79548775`) | react-vite tests only. | N/A | — |
| #36609 / #37278 / #37274 (`88260dcfac`, `b4627ea890`, `1e8425e411`, `3d9b99d40a`) | sort-package-json update reverted. `builder-docgen` export condition order is `types` first. | Note only | Our `exports` already list `types` first in every entry (`package.json`). |
| #37068 (`63bfd7c819`) | dist-contract test timeouts. | N/A | — |
| version bumps (`bb6077ad1b`, `69b9e07a0c`, `e0ecb3ec6b`) | — | — | — |

### Package metadata

- `@storybook/react-vite` `package.json`: **no `exports` change** (no new subpath; `./node` was already there). Builder-docgen deps moved to devDependencies + optional peers.
- `@storybook/react` `package.json`: new `./internal/builder-docgen` (N/A). `react-docgen*` are now optional peers. Dev dep `typescript-native: npm:typescript@7.1.0-beta`.
- React `features` preset: still only `componentsManifest: true`. No React preset enables `experimentalLiveServerSnippets`; only Storybook's own `code/.storybook/main.ts` turns it on.

## Core paths React depends on (diff beta.0 → beta.3)

| Path | Change | Effect on Solid |
| --- | --- | --- |
| `core/src/docs-tools/snippetTemplate.ts` (new, exported from `storybook/internal/docs-tools`) | `SnippetTemplate`, `HolePlace`, `HoleRef`, `TemplateHole`, `PrintHole`, `UnprintableArgError`, `unknownHoleKind`, `stripHoles`, `fillTemplate`, `withHoleSpace`, `prependToTemplate`, `isSnippetTemplate`, `formatTemplate`, `createHoleMarks` | The contract we would implement for live snippets. |
| `core/src/docs-tools/snippetValues.ts` (new) | `printValue(value, name, { quote, opaque })`: JS literal printer that throws `UnprintableArgError` | React's `printHole` uses it for `value`/`code`. Solid can reuse it unchanged. |
| `shared/open-service/services/story-docs/{types,definition,server,live-snippet,snippet}.ts` | `StoryDoc.template?: SnippetTemplate`. The server drops templates that are malformed or whose `stripHoles(template) !== snippet`, and drops **all** templates unless `features.experimentalLiveServerSnippets`. It also prepends the import block to the template. The preview fills the template via `getPrintHole(parameters)` → `parameters.docs.source.printHole` once args differ from the initial args. | Safe to emit templates always: core strips them when the flag is off. |
| `shared/open-service/services/story-docs/README.md` | Documents live snippets and that "each renderer that emits a `template` sets the matching `printHole` in its preview annotations". `import` is still described per file. | Our "story docs `import` field marked for removal" gap: React still sets `import`, so keep it. |
| `types/modules/core-common.ts` | `features.experimentalLiveServerSnippets` (default false, experimental). `componentsManifest` docs now list Svelte. `typescript.docgenSpecifier`. | Live-snippet flag. |
| `shared/open-service/services/{docgen,story-docs}/paths.ts`, `static-names.ts`, `component-state-key.ts` | Static snapshot filenames go through `componentIdToStaticName` (ASCII ids `[A-Za-z0-9._-]` ≤200 chars pass through unchanged; others become `id-<hash>`). State keys are escaped for reserved names (`constructor`) and a leading `~`. | Only matters if our `scripts/check-docgen` reads non-ASCII component ids from static output. Lab ids are ASCII (inferred; not run). |
| `csf-tools/CsfFile.ts`, `estree/ast.ts`, `estree/nodes.ts` | `isCanonicalCsf2BindCall`, `withoutTypeCalls`, `isCsfFactoryCall`, `csfFactoryReceiver` moved to `estree/ast.ts` and re-exported from `CsfFile.ts`. `isValidPreviewPath` moved to `csf/csf-utils.ts`. | Every `csf-tools` export we import (`createStoryArgsResolver`, `createStoryReferenceResolver`, `unresolvedWarning`, `normalizeStoryDeclaration`, `resolveRenderFunction`, `staticKey`, `extractStoryJSDocInfo`, `buildImportStatements`, `collectImportBindings`, `storyShapeError`, `detachedTextOf`, `reindent`, `textOf`, `unwrapExpression`) still exists at beta.3 (grep of `code/core/src/csf-tools`). |
| `component-meta/index.ts` | Adds type export `ProjectCommandLine`. | None. |
| `preview-api/.../PreviewWithSelection.tsx` | Preload batching, `addEventListener?.` guard. | None. |
| `shared/open-service/toolsets/{docs,stories,review}` | MCP/agent toolsets (covered by the other research agent). | See [agent docgen](./agent-docgen-frameworks.md) for the formatter fields we feed. |

## Relevant files and modules

- Upstream: `code/renderers/react/src/{componentManifest/generateCodeSnippet.ts,snippet-values.ts,docs/print-hole.ts,entry-preview-docs.ts,docgen/build-story-docs.ts,componentManifest/resolveComponents.ts,preset.ts,docgen/extractArgTypesFromComponentFile.ts,componentManifest/componentMetaManagerSingleton.ts}`
- Upstream core: `code/core/src/docs-tools/{snippetTemplate,snippetValues}.ts`, `code/core/src/shared/open-service/services/story-docs/{live-snippet,server,types}.ts`
- Ours: `src/internal/codeExamples/generateCodeSnippet.ts`, `src/internal/componentManifest/docgen/storyDocsProvider.ts`, `src/renderer/docs.ts`, `src/internal/componentManifest/manifests.ts`, `src/internal/componentManifest/solidComponentMeta/SolidComponentMetaManager.ts`

## Sources

- `git log` / `git diff v11.0.0-beta.0..v11.0.0-beta.3` in `/tmp/sb-research/sb` (tag dated 2026-11-13), read 2026-11-17.
- Storybook 11 beta blog, https://storybook.js.org/blog/storybook-11-beta/ (published 2026-11-09, updated 2026-11-16, read 2026-11-17). It lists "agent-ready docgen for all core frameworks" and "improved code snippet examples" and does not mention live snippets.

## Open questions

- Whether Storybook will turn `experimentalLiveServerSnippets` on by default before 11.0 GA. At beta.3 it defaults to off everywhere.

## Assumptions and limits

- The PR mapping uses the last `Merge pull request` on each commit's ancestry path to the tag. The version-bump commit `69b9e07a0c` maps to an unrelated PR, which is an artifact of that method.
- The clone is partial (blobless). History searches older than beta.0 failed, so I did not establish when "CSF 4" naming first landed (see [naming](./naming-csf4.md)).
- Nothing was built or run. The statements about live-snippet behavior come from reading the source.
