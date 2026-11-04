# SB 11 compatibility and React parity

> Keep this plan current during implementation.
> Check a stage only after its done-when and verification pass.
> Record scope changes before leaving the stage.

**Goal:** `storybook-solidjs-vite` loads and works on `storybook@11.0.0-beta.0` and matches `@storybook/react` + `@storybook/react-vite` at that tag, wherever the feature applies to Solid.

**Approach:** First land the Babel → ESTree port from PR #76 on top of beta.0 so the preset loads again. Then fix the port's review defects, and close each React gap area in turn: story docs, docgen, CSF Next types, public surface, shared component-meta base, smaller items. The research map is in [research/index.md](./research/index.md). The parity table with React file pointers is in [research/react-parity.md](./research/react-parity.md).

**Decisions**

- Scope is the full gap list in `research/react-parity.md`, including import-path rewriting, adopting core `component-meta`, the `.test()` guard and `optimizeViteDeps`. Nothing is deferred.
- PR #76 (Kasper Peulen) is cherry-picked into `next` with Kasper as author: commits `5802df9^..1ebd879` from `pr-76`, skipping `9066a74` (the pkg.pr.new canary pin). Its review defects and follow-ups (`.briefback/sb11-estree-csf-tools/handoff.md`) are fixed in our own commits.
- Install Storybook packages at `11.0.0-beta.0`, overriding the local release-age gate: `bun add --minimum-release-age=0 …`. This applies to the root, `examples/lab` and `examples/solid1`.
- The peer range is `storybook: ^11.0.0-beta.0 || ^11.0.0`.
- `template/cli` stories stay CSF Next (`preview.meta()`) until Storybook moves React templates and `create-storybook` to CSF Next. Template components still get prop JSDoc.
- `SolidPreview`, `SolidMeta` and `SolidStory` are rebased on core's CSF Next types (`MetaInput`, `MetaTypes`, `StoryArgs`, `TypedMetaArgKeys`, `PreviewAddonEntry`, `meta.type<>()`, required `addons`), mirroring React's `preview.tsx`. This ships in the 11.0 major with a changeset and a MIGRATION.md entry.
- The story-docs provider honors `features.experimentalCodeExamples` the way React does: `false` means no snippets.
- One conventional commit per stage on `next`, plus a changeset (`.changeset/*.md`) for every user-visible change. No push. No comments on PR #76.

**Reuse:** these exist at beta.0; verify each name in `node_modules/storybook` before use.

- `storybook/internal/csf-tools`: `createStoryArgsResolver`, `createStoryReferenceResolver`, `normalizeStoryDeclaration`, `resolveRenderFunction`, `staticKey`, `collectImportBindings`, `resolveIdentifierInit`, `detachedTextOf`, `unresolvedWarning`, `noSnippetWarning`.
- `storybook/internal/common`: `extractDeclaredSubcomponents`, `createMetaComponentResolver`, `getProjectRoot`, `getComponentIdFromEntry`.
- `storybook/internal/docs-tools` (or core docgen helpers): `extractComponentDescription`, `extractStoryJSDocInfo`, `getImportablePackageName`.
- `storybook/internal/component-meta`: `ComponentMetaManager`, `ProgramBackedProject`, `extractComponentJsDocInfo`.
- `storybook/preview-api`: `composeStory`, `composeStories`, `setProjectAnnotations`.
- Upstream reference implementation: `/tmp/sb-research/sb` at `v11.0.0-beta.0`.
  - `code/renderers/react/src/{preset.ts,preview.tsx,portable-stories.tsx,entry-preview.tsx,componentManifest/*,docgen/*}`
  - `code/frameworks/react-vite/{package.json,src/*}`

## Out of scope

- Switching `template/cli` stories to CSF 3. The scaffold mismatch with `create-storybook`'s CSF 3 preview is a known issue left for upstream.
- React-only features: act, StrictMode, RSC, `jsxDecorator` dynamic source, react-docgen / builder docgen, `enrichCsf`.
- Making `typescript` a required peer. We bundle `@typescript/typescript6` on purpose.
- Pushing, publishing, or commenting on GitHub.

## Stage 1 — Land the ESTree port on beta.0

**This stage:** beta.0 removed `storybook/internal/babel`. Six of our files import it, so on beta.0:

- the preset fails to load;
- tests cannot start;
- the lab build silently drops our renderer.

PR #76 already ports those readers to Storybook's ESTree `csf-tools`. Bring its commits in unchanged, as Kasper's work, then move every package to beta.0 and raise the peer floor. Also fix the one typecheck error that `next` already has, so the baseline is green.

- [ ] Complete
  - [x] PR #76 commits `5802df9^..1ebd879` cherry-picked onto `next`, authorship kept. The canary-pin commit is not taken.
  - [x] Root `storybook` and `@storybook/builder-vite` at `11.0.0-beta.0`. `examples/lab` (`storybook`, `@storybook/addon-docs`, `@storybook/addon-vitest`) and `examples/solid1` (`storybook`, `@storybook/addon-docs`) at `11.0.0-beta.0`. Lockfiles updated.
  - [x] Peer `storybook: ^11.0.0-beta.0 || ^11.0.0`. Changeset notes the new floor.
  - [x] `src/preview/reactive-story-component.ts:27` typechecks.

**Files**

- `package.json`, `bun.lock`: dependency and peer versions
- `examples/lab/package.json`, `examples/lab/bun.lock`, `examples/solid1/package.json`, `examples/solid1/bun.lock`: Storybook versions
- PR #76 file set:
  - `src/internal/codeExamples/generateCodeSnippet.ts`
  - `src/internal/componentManifest/{collectCsfArgNames,getComponents,subcomponents}.ts`
  - `src/internal/componentManifest/docgen/{docgen-worker,storyDocsProvider}.ts`
  - `src/spec/**`
  - `.changeset/sb11-estree-csf-tools.md`
- `src/preview/reactive-story-component.ts`: `mergeArgs` typing

**Done when:** on beta.0, typecheck, tests and build pass, and `dist` has no `storybook/internal/babel` import.
**Verify:** `bun run typecheck && bun run test && bun run build && ! grep -r "internal/babel" dist`

## Stage 2 — Fix the port's review defects

**This stage:** The PR #76 review (`.briefback/sb11-estree-csf-tools/handoff.md`) found two defects and four follow-ups:

1. Snippets publish values that name locals or imports which the snippet does not contain.
2. `import X = require()` components get lost.
3. Manifest arg names skip computed keys.
4. Render parameters other than `args` dangle after rewriting.
5. Multi-line children are indented from the wrong line.
6. A test does not pin last-write-wins `Story.args` replacement.

Fix all six to match React's generator. When values are unresolved, report core's `unresolvedWarning`/`noSnippetWarning` instead of shipping a broken snippet.

- [x] Complete
  - [x] A snippet whose resolved args still reference unresolved names keeps the snippet and carries core's `unresolvedWarning` in story docs, like React at beta.0 (scope change: React does not drop it).
  - [x] `import X = require('./Button')` (and `NS.Y`) resolves to an importable component with a module path.
  - [x] `collectCsfArgNames` records every key `staticKey` accepts: computed string, template and numeric keys.
  - [x] Rewritten render functions keep every parameter the body still reads (`(args, context) => …`).
  - [x] Injected multi-line children are indented relative to the line they land on.
  - [x] Test: `export const A = { args: { size: 'lg' } }; A.args = { label: 'last' }` yields `label` only.

**Files**

- `src/internal/codeExamples/generateCodeSnippet.ts`: `getCodeSnippet`: unresolved handling, parameter retention, children indent
- `src/internal/componentManifest/docgen/storyDocsProvider.ts`: surface `warning`
- `src/internal/componentManifest/getComponents.ts`: import-equals bindings
- `src/internal/componentManifest/collectCsfArgNames.ts`: `staticKey`
- `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/componentManifest/*.test.ts`: regression tests

**Done when:** each of the six cases has a test that fails on the stage 1 code and passes now.
**Verify:** `bun run typecheck && bun run test`

## Stage 3 — Story docs payload parity

**This stage:** React's story-docs payload carries three things ours lacks:

- a file-level `import` block, which core prepends to snippets;
- a `summary` from story JSDoc;
- a `warning` for unresolved values.

React also resolves stories imported from another file (`createStoryReferenceResolver` + `filePath`, #36746). Its `import` strings name a component by its package name when the component lives in a publishable package (`getImportablePackageName`, #36676). It honors `experimentalCodeExamples: false`. Bring all of this to Solid with React's code as the reference: `code/renderers/react/src/componentManifest/{resolveComponents,generateCodeSnippet}.ts` and `docgen/story-docs-preset.ts`.

- [x] Complete
  - [x] Story docs payload has `import` (component refs + arg-value refs), `summary`, and `warning`.
  - [x] Snippets for stories that reference another file's story (or a local alias) resolve through `createStoryReferenceResolver`.
  - [x] `import` uses the publishable package name when the component's package is publishable. Otherwise it uses the story's own import.
  - [x] `features.experimentalCodeExamples: false` produces no snippets. README describes this correctly.

**Files**

- `src/internal/componentManifest/docgen/storyDocsProvider.ts`: payload fields, flag
- `src/internal/codeExamples/generateCodeSnippet.ts`: reference resolver, import collection
- `src/internal/componentManifest/getComponents.ts`: importable package name
- `src/framework/preset.ts`: pass the flag through, if the provider cannot read it from options
- `README.md`: code-snippet section
- `src/spec/codeExamples/*`, `src/spec/componentManifest/*`: tests

**Scope change:** `src/framework/preset.ts` untouched (provider reads `features` from options). With the flag off, descriptions and summary are still served. React itself ignores the flag under `docgenServer`.

**Done when:** a story file with an imported story, a JSDoc summary and a package-published component returns `snippet`, `import`, `summary` and `warning` the same way React's provider would for the equivalent React file.
**Verify:** `bun run typecheck && bun run test`

## Stage 4 — Docgen payload parity and args-data path

**This stage:** React's component docgen payload gets three things ours does not:

- its description from meta JSDoc merged with component JSDoc, plus `summary` (`extractComponentDescription`);
- an `error` payload (`No component found` / `No component import found`) instead of nothing;
- its id from core's `getComponentIdFromEntry`.

Separately, `internal_getArgTypesData` joins `process.cwd()` with paths that addon-vitest already passes as absolute. That nulls component-test argTypes. React uses `isAbsolute` and `getProjectRoot()`.

- [x] Complete
  - [x] Docgen payload `description` merges meta and component JSDoc, and adds `summary`, matching React's `buildDocgen.ts`.
  - [x] Missing component / missing import returns React's `error` payload shape.
  - [x] Component id comes from `getComponentIdFromEntry`.
  - [x] `getArgTypesData` accepts absolute paths and resolves relative ones against `getProjectRoot()`.

**Files**

- `src/internal/componentManifest/docgen/docgen-worker.ts`: `docPayload`, error payloads, id
- `src/internal/componentManifest/manifests.ts`: `getArgTypesData` path resolution
- `src/spec/componentManifest/manifests.test.ts`, `src/spec/componentManifest/solidComponentMeta/storyResolution.test.ts`: tests

**Scope change:** payload `path` is the story import path (core type + React); `check-docgen` passes absolute component paths because `getProjectRoot()` is the git root.

**Done when:** the docgen worker returns a description with meta JSDoc, `summary`, and an `error` for a meta with no component, and `getArgTypesData('/abs/path/Button.tsx')` returns argTypes.
**Verify:** `bun run typecheck && bun run test`

## Stage 5 — CSF Next types on core's meta-args model

**This stage:** SB 11 CSF Next tracks meta arg keys, so users need no `as const`, every meta key must be an arg, and `mocked()` works. React's `ReactPreview`/`ReactMeta` build on core's `MetaInput`, `MetaTypes`, `StoryArgs` and `TypedMetaArgKeys`, with `meta.type<>()` and a required `addons` of `PreviewAddonEntry[]`. Ours still has the 10.x shape and a `@ts-expect-error` on `SolidMeta extends Meta`. Rebase on core's types and keep Solid's `story.Component`, then document the type change.

- [x] Complete
  - [x] `SolidPreview`, `SolidMeta` and `SolidStory` follow React's `preview.tsx` type structure. There is no `@ts-expect-error` on the extends.
  - [x] `meta.type<S>()` returns a `SolidMeta`, keeping `.story` overloads and `story.Component`.
  - [x] Type tests cover:
    - meta args without `as const`;
    - a non-arg key rejected;
    - required args left to stories;
    - `meta.type<>()`;
    - custom tags autocompletion;
    - namespace addons.
  - [x] Changeset plus a `MIGRATION.md` entry for the user-facing type changes.

**Files**

- `src/preview/define-preview.ts`: `SolidPreview`, `SolidMeta`, `SolidStory`, `createSolidDefinePreview`
- `src/preview/public-api.ts`: exported types
- `src/preview/reactive-story-component.ts`: types consumed by `story.Component`
- `src/spec/packageExports/consumer.ts`, `src/spec/preview/story-component.test.ts`: type tests
- `examples/lab/src/**/*.stories.tsx`: keep the lab typechecking
- `MIGRATION.md`

**Done when:** a consumer file using React's CSF Next type test cases (adapted to Solid) typechecks, with `@ts-expect-error` only where React's test expects an error.
**Verify:** `bun run typecheck && bun run test && bun run build`

## Stage 6 — Portable stories and `./node` export

**This stage:** React exports `setProjectAnnotations`, `composeStory`, `composeStories` and `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS`, wired to its renderer defaults, so plain Vitest/Jest/Playwright CT can render stories. Storybook's `csf-factories` codemod writes `import { defineMain } from '<framework>/node'`, and our package has no `./node` subpath. Add both. The portable layer follows `code/renderers/react/src/portable-stories.tsx`, using the active Solid renderer annotations through `preview-addon`.

- [ ] Complete
  - [ ] `setProjectAnnotations`, `composeStory`, `composeStories`, `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` exported from the package root, typed for Solid.
  - [ ] `composeStories(stories)` renders a Solid story into a container in a Vitest test, with `play` running.
  - [ ] `exports["./node"]` points at `src/node.ts` / `dist/node.js`, with types.
  - [ ] Changeset.

**Files**

- `src/preview/portable-stories.ts`: create. `src/preview/public-api.ts` holds types only; React keeps this layer in its own module.
- `src/index.ts`: export the portable API
- `package.json`: `exports["./node"]`
- `tsdown.config.ts`: entry, if needed
- `src/spec/packageExports/consumer.ts`, `src/spec/packageExports/publicTypes.test.ts`: `./node` and portable types
- `src/spec/preview/portable-stories.test.ts`: create, runtime test

**Done when:** a Vitest test calls `composeStories` on a CSF 3 stories module and a CSF Next one and renders both, and `storybook-solidjs-vite/node` resolves under `nodenext` and `bundler`.
**Verify:** `bun run typecheck && bun run test && bun run build`

## Stage 7 — Adopt core component-meta and subcomponent helpers

**This stage:** Core has shipped `storybook/internal/component-meta` since 2026-07, and React's docgen extends it:

- `ComponentMetaManager`, a TypeScript program manager with a watcher, heap recycling and tsconfig lookup;
- `ProgramBackedProject`;
- `extractComponentJsDocInfo`.

Core also ships `extractDeclaredSubcomponents` / `createMetaComponentResolver` in `storybook/internal/common`. Our `SolidComponentMetaManager`/`SolidComponentMetaProject` and `subcomponents.ts` are standalone copies. Move onto the core base classes. Keep the Solid-specific parts: Solid prop resolution, DOM props, serialization, the bundled `@typescript/typescript6`. Delete the duplicated infrastructure. Behavior must not change.

- [x] Complete
  - [x] `SolidComponentMetaManager` / `SolidComponentMetaProject` extend core's `ComponentMetaManager` / `ProgramBackedProject`. The duplicated watcher, heap-recycle and tsconfig code is removed where core covers it.
  - [x] Declared subcomponents come from core's `extractDeclaredSubcomponents`.
  - [x] Every existing docgen test, including `heapRecycle` and `tsconfigProjectReferences`, passes unchanged.

**Files**

- `src/internal/componentManifest/solidComponentMeta/SolidComponentMetaManager.ts`
- `src/internal/componentManifest/solidComponentMeta/SolidComponentMetaProject.ts`
- `src/internal/componentManifest/solidComponentMeta/findTsConfigForFile.ts`: delete if core covers it
- `src/internal/componentManifest/subcomponents.ts`
- `src/internal/componentManifest/docgen/docgen-worker.ts`: wiring
- `src/spec/componentManifest/**`

**Scope change:** our tsconfig lookup is kept (core falls back to an inferred project and drops `paths`/JSX options). It reaches core's private `getOrCreateConfiguredProject`, pinned by a spec. `subcomponents.ts` is deleted in favor of core's `extractDeclaredSubcomponents`. Heap-pressure warning text is core's.

**Done when:** the solidComponentMeta and subcomponent specs pass unchanged, with the shared infrastructure coming from core.
**Verify:** `bun run typecheck && bun run test && bun run check-docgen`

## Stage 8 — Smaller parity items

**This stage:** The remaining small React parity items:

- prop JSDoc on template components (React #37082), so server docgen shows types and descriptions in JS init projects;
- React's guard that throws on `.test()` stories when `features.experimentalTestSyntax` is off. We default the flag on, so this only affects users who turn it off;
- a decision on `optimizeViteDeps`. Mirror React only when a cold-cache lab Vitest browser run shows a dependency-optimization reload. Otherwise record why Solid does not need it;
- making the lab build fail loudly when Storybook prints "Failed to load preset", since it exits 0.

- [ ] Complete
  - [x] `template/cli/{js,ts}` Button/Header/Page components carry prop JSDoc (`@param` in JS, doc comments in TS) like React's templates. Stories unchanged (CSF Next).
  - [x] A `test-fn` story with `experimentalTestSyntax` off throws React's error.
  - [ ] `optimizeViteDeps` added for Solid runtime entries if a cold Vitest browser run reloads. Otherwise the reason is recorded in `.briefback/docs/framework/preset-and-version.md`.
  - [x] Lab `build-storybook` fails on "Failed to load preset".

**Files**

- `template/cli/js/{Button,Header,Page}.jsx`, `template/cli/ts/{Button,Header,Page}.tsx`
- `src/renderer/solid2.ts`, `src/renderer/solid1.ts` (or `src/renderer/shared/apply-decorators.ts`): test-fn guard
- `src/framework/preset.ts` or `src/renderer/index.ts`: `optimizeViteDeps`
- `examples/lab/package.json`, `examples/lab/scripts/*`: preset-load check
- `src/spec/renderer/*.test.ts`: guard test

**Scope change:** the preset-load wrapper lives in root `scripts/build-storybook.ts` and is shared by `examples/lab` and `examples/solid1`. The guard uses `createDecorator`. `optimizeViteDeps` is not added (Solid ships ESM, Solid Vite plugins prebundle the runtime); the cold-cache lab Vitest run is pending for stage 9.

**Done when:** the template components document every prop, the guard has a test, the optimizeViteDeps decision is recorded, and a broken preset fails the lab build.
**Verify:** `bun run typecheck && bun run test && bun run lab:build-check` (or the script added for it)

## Stage 9 — Final check on beta.0 and docs

**This stage:** Run the full integration surface on beta.0 and bring the durable docs up to date:

- the lab static build with docgen check;
- lab Vitest;
- `examples/solid1`.

Update `.briefback/docs/framework/*` so they describe the new behavior. Mark `.briefback/sb11-estree-csf-tools/handoff.md` resolved.

- [ ] Complete
  - [ ] `bun run check-docgen` passes. `bun run test:lab` passes.
  - [ ] `examples/solid1` `build-storybook` succeeds with the preset loaded.
  - [ ] `.briefback/docs/framework/*` updated. The old handoff is marked done.
  - [ ] Lint clean.

**Files**

- `.briefback/docs/framework/{canvas-renderer,docgen,manifests-and-snippets,preview-and-csf,package-surface,preset-and-version}.md`
- `.briefback/sb11-estree-csf-tools/handoff.md`
- `README.md`: anything stale

**Done when:** every lab and solid1 check passes on beta.0, and the docs match the code.
**Verify:** `bun run lint && bun run build && bun run check-docgen && bun run test:lab && (cd examples/solid1 && bun run build-storybook)`
