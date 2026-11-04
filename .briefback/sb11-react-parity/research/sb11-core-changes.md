# Storybook core changes that matter to storybook-solidjs-vite (11.0.0-alpha.6 → 11.0.0-beta.0)

## Summary

We are locked to `storybook@11.0.0-alpha.6`. `11.0.0-beta.0` (published 2026-11-03T18:49Z, feature freeze) has one hard break for this package and a few changes we should track.

- **Hard break.** `storybook/internal/babel` is gone, and `csf-tools` now returns ESTree (OXC) nodes. Babel-shaped `CsfFile` fields (`_ast`, `_file`, `_storyPaths`, `_storyDeclarationPath`) and `extractDescription(node)` (now 2 args) changed too. The removal landed in **alpha.8**, not beta.0 (`3cc9d4f0a9`, PR #36613). MIGRATION.md names `storybook-solidjs-vite` under "Community packages that need a release". Six of our source files (and two spec files) are affected. PR #76 covers all of them.
- **Everything else we import still exists.** Every other `storybook/internal/*`, `storybook/preview-api`, `storybook/test`, and `@storybook/builder-vite` symbol in `src/` is present at beta.0. The node-side ones we use have no diff in this window (verified by `git diff` on their defining files).
- **Behavior changes, no code change needed.** Targeted-arg grouping is always on. `combineTags` drops empty tags. Extended factory stories inherit their parents' tags. The Code panel is on by default. The Story Docs manager service registers only when `FEATURES.docgenServer` is true. `features.argTypeTargetsV7` and `disallowImplicitActionsInRenderV8` are removed.
- **Pre-existing CSF Next gap.** `SolidMeta` still extends core `Meta<T, MetaInput>` behind a `@ts-expect-error`. Since before alpha.6, core's second type parameter is the union of meta arg keys (`TMetaArgKeys extends PropertyKey`). This is a React-parity gap, not a beta.0 break.

## How it works (what changed, by area)

Columns: what changed, source, affects us?, our files. "Observed" means I verified it in source, git, or the trial build. "Inferred" means I reasoned it from source and did not execute it.

### A. Parsing, csf-tools, Babel removal

| Change | Source | Affects us? | Our files |
| --- | --- | --- | --- |
| `storybook/internal/babel` export removed. `recast` and `@babel/*` dropped from core deps. `oxc-parser` goes from ^0.127 to ^0.155. | MIGRATION "`storybook/internal/babel` removed; `csf-tools` uses ESTree". Commit `3cc9d4f0a9` (2026-10-13), PR #36613 (merge `63616a560d`). First published in **11.0.0-alpha.8**: `code/core/src/babel` exists at alpha.7 and not at alpha.8. | **Yes, hard break (observed).** The preset fails to load. | `src/internal/codeExamples/generateCodeSnippet.ts`, `src/internal/componentManifest/collectCsfArgNames.ts`, `.../getComponents.ts`, `.../subcomponents.ts`, `.../docgen/storyDocsProvider.ts`, `src/spec/codeExamples/generateCodeSnippet.test.ts` |
| `CsfFile._ast` and NodePath fields removed. Use `csf.program` and `csf.editor` (made public in `bc4cbe813b`, which is in alpha.8). `_program` and `_editor` stay as deprecated aliases. Node shapes are now ESTree (`Literal`, `Property`, not `StringLiteral` or `ObjectProperty`). | MIGRATION, same section | **Yes (observed TS errors).** `_ast`, `_file`, `_storyPaths`, `_storyDeclarationPath` no longer exist on `CsfFile`. `_metaAnnotations`, `_storyAnnotations`, `_metaNode` and `_storyStatements` still exist but now hold ESTree nodes. | Same files, plus `src/internal/componentManifest/docgen/docgen-worker.ts:70`, `src/spec/componentManifest/subcomponents.test.ts:60`, `src/spec/helpers/storyScenario.ts:78` |
| `extractDescription(node)` became `extractDescription(node, editor)`. `extractSource(node)` became `extractSource(node, code)`. | MIGRATION, same section | **Yes (observed).** | `src/internal/componentManifest/docgen/storyDocsProvider.ts:40` |
| Story-shape helpers renamed (`keyOf` → `staticKey`, `metaObjectPath` → `metaObject`, `sourceOf` → `oneLineTextOf`, …). New public helpers: `createStoryArgsResolver` (returns `args`, `imports`, `unresolved`), `resolveRenderFunction`, `normalizeStoryDeclaration`, `collectImportBindings`, `detachedTextOf`, `printMembers`. | MIGRATION. `code/core/src/csf-tools/story-shape/index.ts` and `csf-tools/index.ts` at beta.0 | Only through PR #76, which uses them. All 10 helper names PR #76 imports are exported at alpha.8, alpha.9 and beta.0 (observed). | PR #76 files |
| `parameters.docs.source.originalSource` is the authored text instead of a Babel reprint. Flow-only syntax in story files is a parse error. String-literal meta keys are read, and computed identifier keys are ignored. | MIGRATION, "Behavior that changes for every project" | Indirect. Our snippets come from our own `experimental_storyDocsProvider`, not from `originalSource`. | none |
| `CsfFile.stories` tells factory stories apart (`28fcc4a467`). Extended stories inherit parent tags in the indexer (`e5ae385d94`). | commits | Free win through core. No change needed (inferred). | none |
| `isTSWrapper` and `unwrapExpression` accept any `{ type }`. `ImportBindings`, `locationOf`, `isIdentifier`, `objectProperty` are newly exported. | `git diff b26f35e1aff..v11.0.0-beta.0 -- code/core/src/csf-tools` (4 commits, additive) | No. PR #76's canary → beta.0 csf-tools delta is additive (inferred compatible). | — |

### B. Preset, features, docgen

| Change | Source | Affects us? | Our files |
| --- | --- | --- | --- |
| `features.argTypeTargetsV7` and `disallowImplicitActionsInRenderV8` removed. Targeted args are always grouped: the render function gets untargeted `args`, and `allArgs` and `argsByTarget` are always set. | MIGRATION. Commit `270b866bbf` (after alpha.8). `prepareStory.ts` | Low. We do not set either flag (observed grep). The Solid stores wrap `context.args`, which now never contains `target`ed args. That matches React. | `src/renderer/shared/story-store.ts` (behavior only) |
| `docgenServer` stable. Core defaults it from preset `isDocgenProviderEnabled`. A `typescript` 5.9/6 gate warns via `getTypeScriptForDocgenError`. | MIGRATION "`docgenServer` is stable…". `code/core/src/common/utils/typescript-for-docgen.ts` | No. The gate's `RENDERERS_WITH_TYPESCRIPT_DOCGEN` is React, Svelte, Vue3 and WC only. Our preset sets `docgenServer` itself, and our worker bundles `@typescript/typescript6`. | `src/framework/preset.ts` |
| New `features.experimentalChunkedPreviewRuntime` (default false). "Ship one chunked preview runtime" (`e86a0b7329`). | `core-common.ts` diff, `common-preset.ts` | No. | — |
| Story Docs manager service registers only if `FEATURES.docgenServer` is true (new `story-docs/manager.tsx`, after alpha.8). | diff alpha.8..beta.0 | With `docgen: false` our snippets never reach the manager. That is consistent with our opt-out (inferred). | `src/framework/docgenOption.ts` |
| `experimentalTestSyntax` stays a framework-typed flag. Docs say "Default: `true` for React, Angular Vite, and Vue 3 Vite". | `docs/api/main-config/main-config-features.mdx` | We already force it on. I did not find where React defaults it in code; see open questions. | `src/framework/preset.ts` |
| Docs Code panel on by default. | MIGRATION "Docs Code panel enabled by default" | Users now see our snippets without opting in. Snippet quality matters more (PR #76 defect 1). | `src/internal/codeExamples/*` |
| Server-side snippets do not update when args change (until 11.1). | MIGRATION "Temporary regressions on source snippet generation" | Same limitation applies to our server snippets (inferred). | — |

### C. Types and preview API

| Change | Source | Affects us? | Our files |
| --- | --- | --- | --- |
| Deprecated aliases removed: `StoryKind`, `AnyFramework`, `StoryContextForLoaders`, `PlayFunctionContext`, `StoriesHash`, `StoryIdentifier.kind/story`, `StoryAnnotations.story`. `RenderContext` drops `kind/story`. `Story.story = {…}` annotations are no longer read. | MIGRATION "Deprecated CSF and manager type aliases removed", "CSF `.story` annotations removed". Commit `566ce343d0` | No. None of these is imported or read (observed grep). | — |
| `argTypes` removed from the loaders, `beforeEach`, `play`, `afterEach` context. Use `StoryContextForRender` for render and decorators. | MIGRATION | No. The renderer does not read `argTypes` (observed grep). | — |
| `AddonTypes.tags` widened to `unknown`, so addons can narrow tags. | `code/core/src/csf/story.ts` | No. Already in alpha.8, where `define-preview.ts` typechecked cleanly (observed). | `src/preview/define-preview.ts` |
| CSF Next `Meta<TRenderer, TMetaArgKeys extends PropertyKey>`: meta remembers arg keys, so `as const` is no longer needed. Use `mocked()` for the mock API. Every meta arg key must be an arg. | MIGRATION "CSF Next: …" (3 sections). Signature identical at alpha.6, alpha.8 and beta.0 | **Parity gap, not a break.** `SolidMeta extends Meta<T, MetaInput>` under `@ts-expect-error` (`src/preview/define-preview.ts:62-64`). Our `StoryObj` still uses `AddMocks`. Solid users do not get the SB11 meta-args typing React gets. | `src/preview/define-preview.ts`, `src/preview/public-api.ts` |
| `combineTags` ignores empty tags. `defineStory().extend` passes raw tags and composes later (`e5ae385d94`, `b141eff55b`). | `csf-utils.ts`, `csf-factories.ts` | Free through `definePreviewBase` (inferred). Note: `story.extend()` results do not get our `story.Component` (pre-existing). | `src/preview/define-preview.ts` |
| `mockChannel` removed from `storybook/preview-api`. | MIGRATION | No. We import only `composeStory` and `defaultDecorateStory`. | — |

### D. Builder, CLI, peers

| Change | Source | Affects us? | Our files |
| --- | --- | --- | --- |
| Vite floor 6.3. Node ≥ 22.12. TypeScript ≥ 5.9. | MIGRATION | No. `peerDependencies.vite` is already `^6.3.0 \|\| ^7 \|\| ^8`, and `engines.node` is already `>=22.12.0`. | `package.json` |
| `@storybook/builder-vite`: `viteConfigPath?: string \| null` (`5bf7eb97b3`). Config discovery is bounded by project root and reports misses. Peers: `storybook workspace:^` and `vite ^6.3 \|\| ^7 \|\| ^8`. | `code/builders/builder-vite/src/types.ts` diff | Type flows through our `FrameworkOptions`. No change needed. | `src/framework/public-api.ts` |
| `storybook/internal/babel` consumers: `getBabelDependencies` removed from `internal/cli`, and the Vitest config helpers moved to `internal/cli`. | MIGRATION | No. | — |
| create-storybook: Solid generator (`ProjectType.SOLID`, `SupportedRenderer.SOLID`, `SupportedFramework.SOLID`, builder override Vite) is unchanged. The `solid: 'storybook-solidjs-vite'` mapping is unchanged. Astro was added as a community framework (`2cc8a6434f`). "Only offer builders the renderer has a framework for" (`d123823fab`). | `code/lib/create-storybook/src/generators/SOLID/index.ts`, `bin/modernInputs.ts`, `common/utils/get-storybook-info.ts` | No change needed (observed). | `template/cli/*` |
| Automigrations for SB ≤10 removed. New ones: `remove-legacy-feature-flags`, `typescript-dependency`, `csf-next-mocked-args`, `vitest-setup-file`. | MIGRATION | Lab and template do not set the removed flags. Lab does not call `setProjectAnnotations` (observed). | `examples/lab`, `template/` |
| Vitest addon: Vitest ≥ 4, and no `setProjectAnnotations` in setup files. | MIGRATION | Lab already uses Vitest 4 and `test.projects` (observed). | `examples/lab/vitest.config.ts` |

### React parity pointers (beyond this question)

Between alpha.6 and beta.0, React changed `generateCodeSnippet.ts` (+/-643 lines; indent snippet values where they land, async render, template literal lines), `getComponentImports.ts`, `enrichCsf.ts`, and its preset (`isTypeScriptReadyForDocgen`). The react-vite preset now uses `getTypeScriptForDocgenError` and `isDocgenServerDisabledInMainConfig`. These are models for our snippet and preset work, not requirements.

## Relevant files

Ours:
- `src/internal/codeExamples/generateCodeSnippet.ts`
- `src/internal/componentManifest/{collectCsfArgNames,getComponents,subcomponents}.ts`
- `src/internal/componentManifest/docgen/{storyDocsProvider,docgen-worker}.ts`
- `src/preview/define-preview.ts`
- `src/framework/preset.ts`
- `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/helpers/storyScenario.ts`, `src/spec/componentManifest/subcomponents.test.ts`

Storybook (at `/tmp/sb-research/sb`):
- `MIGRATION.md`, "From version 10.x to 11.0.0" (line 639 onward)
- `code/core/package.json` (exports)
- `code/core/src/csf-tools/{index.ts,CsfFile.ts,story-shape/index.ts}`
- `code/core/src/types/modules/core-common.ts`
- `code/core/src/csf/{story.ts,csf-factories.ts,csf-utils.ts}`
- `code/core/src/preview-api/modules/store/csf/prepareStory.ts`
- `code/core/src/common/utils/typescript-for-docgen.ts`
- `code/builders/builder-vite/src/types.ts`
- `code/lib/create-storybook/src/generators/SOLID/index.ts`

## Constraints

- Any Storybook ≥ 11.0.0-alpha.8 cannot load the current `dist/renderer.js` preset (observed on alpha.8). The peer range `^11.0.0-0 || ^11.0.0` admits those versions, so a user on alpha.8+ or beta.0 gets a broken install today.
- The Babel and ESTree split is binary. The current code works only on ≤ alpha.7, and PR #76 works only on ≥ alpha.8. MIGRATION suggests `typeof csfTools.parseModule === 'function'` for dual support. Dual support is not worth it for a prerelease-only line (inferred).
- Do not edit `AGENTFLOW.md`. Add a changeset for the user-facing fix.

## Sources (accessed 2026-11-04)

- storybookjs/storybook tag `v11.0.0-beta.0` (local clone at `/tmp/sb-research/sb`): `MIGRATION.md`, and `git log`/`git diff v11.0.0-alpha.6..v11.0.0-beta.0` over `code/core`, `code/builders/builder-vite`, `code/lib/create-storybook`, `code/lib/cli-storybook`, `code/addons/docs`, `code/addons/vitest`, `docs/`. 1963 commits in range.
- npm `storybook` publish times (`npm view storybook time`): alpha.6 2026-10-12, alpha.7 2026-10-20, alpha.8 2026-10-23, alpha.9 2026-11-02, beta.0 2026-11-03.
- storybookjs/storybook PR #36613 (merge `63616a560d`), commit `3cc9d4f0a9`.
- `.briefback/sb11-estree-csf-tools/handoff.md` (prior PR #76 review).
- Trial results: `upgrade-breakage.md` (same folder).

## Open questions

- Where React gets `experimentalTestSyntax: true` by default at beta.0. Docs say it does, but `git grep` finds only the type and the entry-preview guard. If core never defaults it, our forced `true` is still right.
- Confirm the alpha.8 typecheck carries over to beta.0. `AddonTypes.tags: unknown` is already in alpha.8, and our `define-preview.ts` compiled there. From alpha.8 to beta.0 the type files under `csf`, `types`, `test` and `docs-tools` change by only 44 lines: the tags runtime, doc links, the removed legacy flags, and new enum members. So a clean beta.0 typecheck (after the Babel port) is likely, but I have not verified it.
- Should we adopt the SB11 CSF Next meta-arg-keys typing (React's `ReactMeta`) now, or in a later parity pass?

## Assumptions and limits

- I verified symbol existence with `git grep -w` counts and `git diff --stat` on the defining files. I did not install and type-check against beta.0 itself (see `upgrade-breakage.md`: blocked by the local `minimumReleaseAge`). For the Babel break, I ran the trial on alpha.8, which has the same break.
- The git clone is partial (promisor remote). A few historical blobs could not be fetched, but none of the files cited here.
- I skimmed `docs/` only for framework, renderer, CSF, docgen and test pages. Manager and UI-only changes (sidebar, theming, tooltip APIs, highlight) were judged irrelevant to this package.
