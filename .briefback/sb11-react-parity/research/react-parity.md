# React parity at Storybook 11.0.0-beta.0

Research only. Compares `storybook-solidjs-vite` on branch `next` (installed core `storybook@11.0.0-alpha.6`) with `@storybook/react` + `@storybook/react-vite` at tag `v11.0.0-beta.0` (clone at `/tmp/sb-research/sb`). Commit-by-commit changes are in [react-changes-alpha6-beta0.md](./react-changes-alpha6-beta0.md).

## Summary

The canvas runtime, the preset, and server docgen are at parity or differ on purpose. The real gaps are in five places:

1. **Hard blocker:** beta.0 removed `storybook/internal/babel`. Five of our server files still import it, so on beta.0 the docgen worker and the story-docs provider will not load. React moved to the ESTree `csf-tools` helpers in #36613. Our port is draft PR #76 (see `.briefback/sb11-estree-csf-tools/handoff.md`).
2. **The `create-storybook --type=solid` scaffold is likely broken.** The templates call `preview.meta()` on `../../.storybook/preview`. `create-storybook` writes a plain CSF 3 `const preview: Preview = {…}` object there and has no CSF Next path. Inferred from reading the code; not run.
3. **CSF Next types fall behind core.** React's `ReactPreview` / `ReactMeta` are built on core's `MetaInput`, `MetaTypes`, `StoryArgs`, `TypedMetaArgKeys`, `PreviewAddonEntry` and `meta.type<>()`. These already exist in alpha.6. `SolidPreview` / `SolidMeta` still use the 10.x shape: inferred `TMetaArgs`, `AddMocks`, optional `addons`, and a `@ts-expect-error` on `extends Meta`. Three behaviours in the SB 11 MIGRATION.md entries do not hold for Solid: no `as const` needed, every meta arg key must be an arg, and `mocked()`.
4. **Missing public surface:**
   - Portable stories (`setProjectAnnotations`, `composeStory`, `composeStories`).
   - A `./node` subpath. The `csf-factories` codemod writes `import { defineMain } from '<framework>/node'`.
5. **Story-docs and docgen payloads are thinner than React's:**
   - No `import` block, `summary`, or `warning` for unresolved values.
   - No meta-JSDoc description, and no `error` payload when no component is found.
   - `internal_getArgTypesData` mangles absolute paths, which is what addon-vitest passes.

## Parity table

Status: ✓ parity · **gap** missing · **divergent** different on purpose or by accident · N/A not applicable to Solid.

### Package surface

| Capability | React (file) | Ours (file) | Status | Note |
|---|---|---|---|---|
| Root export with CSF types + `definePreview` | `react-vite/src/index.ts` re-exports `@storybook/react` and `__definePreview as definePreview` | `src/index.ts` (`definePreview = createSolidDefinePreview(previewAddon)`) | ✓ | |
| Node entry for `main.ts` (`defineMain`, `StorybookConfig`) | `react-vite` `exports["./node"]` → `src/node/index.ts` | `"node"` condition on `.` → `src/node.ts`. There is **no** `./node` subpath | **gap** | The `csf-factories` codemod hardcodes `frameworkPackage + '/node'` for main (`lib/cli-storybook/src/codemod/helpers/config-to-csf-factory.ts:61`), so it writes `storybook-solidjs-vite/node`, which does not resolve. Fix: add `"./node"` to `exports`. |
| Preset entry | `react-vite/preset.js` → `dist/preset.js`; renderer `@storybook/react/preset` | `./preset`, `./next/preset` → `src/framework/preset.ts`; renderer `./renderer` → `src/renderer/index.ts` | ✓ | |
| Preview entries | `./entry-preview`, `./entry-preview-argtypes`, `./entry-preview-docs`, `./entry-preview-rsc` | `./renderer/solid1`, `./renderer/solid2`, `./renderer/preview-addon`, `./renderer/docs` | divergent | Split by Solid major instead of by concern. Intentional. |
| Docgen worker entry | `./internal/docgen-worker` | `./internal/docgen-worker` | ✓ | |
| `typescript` peer | Required peer `^5.9 \|\| ^6 \|\| ^7` (#36987) | Optional peer `*`; we bundle `@typescript/typescript6` | divergent (intentional) | Our docgen does not depend on the user's TS, so core's "TS not usable" warning path does not apply. |

### Preset (`main.ts` side)

| Capability | React (file) | Ours (file) | Status | Note |
|---|---|---|---|---|
| `core.builder` / `core.renderer` | `react-vite/src/preset.ts` | `src/framework/preset.ts` `core` | ✓ | |
| `features.componentsManifest: true` | `renderers/react/src/preset.ts` `features` | `features` | ✓ | |
| `features.docgenServer` default | Core asks `isDocgenProviderEnabled`. React's version returns `isTypeScriptReadyForDocgen(...)` | `isDocgenProviderEnabled` returns `options.docgen !== false`, and `features` forces `docgenServer: docgenEnabled` | divergent (intentional) | Our opt-out is `framework.options.docgen: false`. React's is `features.docgenServer: false`. Theirs warns and falls back to builder docgen; ours turns docgen off. |
| `features.experimentalCodeExamples` | Not defaulted. Read only by React `enrichCsf` and `entry-preview-docs`, and only when `docgenServer` is off | Defaulted `true` | **divergent** | In core this flag does nothing (grep: only React reads it). Our story-docs provider ignores it, so README "Autodocs code snippets → set `experimentalCodeExamples: false` to disable" is wrong. |
| `features.experimentalTestSyntax` | Not defaulted. `entry-preview.tsx` decorator throws on `test-fn` stories when the flag is off | Defaulted `true`, no guard | divergent | Ours is more permissive. With the flag off, `.test()` still runs and nothing warns. Low priority. |
| `previewAnnotations` | Adds `entry-preview`, `entry-preview-argtypes`, and `entry-preview-docs` only when `docs` preset is non-empty, plus RSC behind a flag | `src/renderer/index.ts` `previewAnnotations`: Solid major entry + `renderer/docs` always | divergent (minor) | We always add the docs annotations. Harmless. |
| `viteFinal` | `react-vite`: no-op when `docgenServer` is on, else injects react-docgen plugins. Renderer `viteFinal` prepends a React dedupe/alias plugin from `resolvedReact` (#36841) | Aliases preview-addon and the inactive major onto the active renderer, `resolve.dedupe` Solid packages, `optimizeDeps.exclude` self | ✓ / N/A | No builder docgen by design. Dedupe is our counterpart to React's alias plugin. |
| `optimizeViteDeps` | `['react','react-dom/client','react-dom/test-utils','react/jsx-runtime']` (#36682, #36824) | none | open question | Inferred: Solid is ESM-only, so the CJS failure React fixes does not apply. A first-run reload in Vitest browser mode when `@solidjs/web` is first seen is possible but not observed. |
| `experimental_docgenProvider` | `docgen/preset.ts` | `src/internal/componentManifest/docgen/docgenProvider.ts` | ✓ | |
| `experimental_storyDocsProvider` | `docgen/story-docs-preset.ts` | `src/internal/componentManifest/docgen/storyDocsProvider.ts` | ✓ (payload gaps below) | |
| `experimental_manifests` | `componentManifest/generator.ts`: empty `v:0` stub with `meta.docgen` when `docgenServer` is on, full legacy manifest otherwise | `manifests.ts` `generateComponentManifests`: always the empty stub | divergent | With `docgen: false` we emit no manifest. React still builds one through builder docgen. Acceptable given our opt-out semantics. |
| `experimental_enrichCsf` (compile-time snippets) | `enrichCsf.ts`, only when `experimentalCodeExamples && !docgenServer` | none | N/A | Only exists for the non-server path, which we do not support. |
| `internal_getArgTypesData` | `preset.ts`: `path.isAbsolute(p) ? p : join(getProjectRoot(), p)`, reads `typescript` preset | `manifests.ts` `getArgTypesData`: `join(process.cwd(), componentFilePath)` | **gap (bug)** | addon-vitest passes Vite's absolute module id (`addons/vitest/src/vitest-plugin/index.ts:166`). `join(cwd, '/abs')` yields `cwd/abs`, so the extract returns `null`. Also uses `cwd` where React uses `getProjectRoot()`. |
| `resolvedReact`, `webpack` | renderer preset | none | N/A | React and webpack only. |
| `FrameworkOptions` | `builder`, `strictMode` | `builder`, `docgen?: false` | ✓ / N/A | `strictMode` is React only. |
| `typescript.reactDocgen*` options | `react-vite/src/types.ts` (deprecated) | none | N/A | |

### Docgen, manifests, story docs (server)

| Capability | React (file) | Ours (file) | Status | Note |
|---|---|---|---|---|
| Worker built on `createLazyDocgenMiddleware` | `docgen/docgen-worker.ts` | `docgen/docgen-worker.ts` | ✓ | |
| TS loading | `loadTypeScriptCompilerApi(() => import('typescript'))`, warns and passes through on failure (#36987, #35834) | Static `@typescript/typescript6` | divergent (intentional) | |
| Component-meta manager | Extends core `storybook/internal/component-meta` (`ComponentMetaManager`, `ProgramBackedProject`, `extractComponentJsDocInfo`) | Standalone copy: `solidComponentMeta/SolidComponentMetaManager.ts`, `SolidComponentMetaProject.ts` (own watch, heap recycle, tsconfig search) | **divergent** | Core has had the base class since 2026-07-29. Adopting it would remove duplicated watcher, heap-recycle and tsconfig code, and pick up core's fixes. Size L. |
| CSF parsing for docgen | `storybook/internal/csf-tools` ESTree (`createStoryArgsResolver`, `normalizeStoryDeclaration`, `collectImportBindings`, …) | Babel via `storybook/internal/babel` in `getComponents.ts`, `subcomponents.ts`, `collectCsfArgNames.ts`, `generateCodeSnippet.ts`, `storyDocsProvider.ts` | **gap (blocker)** | `code/core/src/babel` is gone at beta.0. PR #76 ports this; the handoff lists 2 defects and 4 follow-ups. |
| Declared subcomponents | Core `extractDeclaredSubcomponents` / `createMetaComponentResolver` from `storybook/internal/common` (generalized in #36328) | Own Babel copy in `subcomponents.ts` | divergent | Moving to core's helper also clears one Babel import. |
| Docgen payload: `id`, `name`, `path`, `argTypes`, `import`, `jsDocTags`, `subcomponents`, `reactComponentMeta` | `buildDocgen.ts` + `buildReactComponentDocgen.ts` | `docgen-worker.ts` `docPayload` | ✓ | We compute `id` by hand; core exports `getComponentIdFromEntry`. |
| Docgen `description` merging meta JSDoc with component JSDoc, plus `summary` | `extractComponentDescription(metaJsDoc, docgenDescription, tags)` | Component description only | **gap** | S |
| Docgen `error` payload when component not found | Returns `{ error: { name: 'No component found' \| 'No component import found', message + code frame } }` | Returns `undefined` (falls through) | **gap** | The manifest debugger and MCP get no explanation. S |
| Package-name import rewriting | `getImportablePackageName`: imports a component in a publishable package by its package name, keeps the story's import for private app packages (#36676) | Always the story's own `importId`, which may be relative | **gap** | Affects MCP and docs `import` strings. M |
| Story docs: `snippet`, `description` | `resolveComponents.ts` `extractStorySnippets` | `storyDocsProvider.ts` | ✓ | |
| Story docs: `summary` | `extractStoryJSDocInfo` | none | **gap** | S |
| Story docs: `warning` for unresolved values | `unresolvedWarning(snippet.unresolved)` | none | **gap** | Same as handoff defect 1. Covered if PR #76 uses `unresolved`. |
| Story docs: file-level `import` block | Component refs + arg-value refs (`buildImportStatements`) | not set | **gap** | Core prepends `payload.import` to snippets. Without it, Solid snippets are shown with no imports. S/M |
| Imported story references (`Template.bind({})` from another file, local aliases) | `createStoryReferenceResolver` + `filePath`; `importedBoundStory` (#36746) | Local `.bind` only | **gap** | Check whether PR #76 passes `references`. |
| Snippet printing fixes (async render, template literals, comma expressions, unsafe JSX strings, own-args only, re-indent) | #36613, #36948 | Old Babel/recast logic: `key in merged`, string attrs printed raw | **gap** | Covered by PR #76 per handoff; multi-line children indent is still follow-up #4. |
| Engine id reported | `react-component-meta` | `react-component-meta` (`MANIFEST_DOCGEN_ENGINE`) | ✓ | Deliberately borrows React's id for the debugger UI. |

### Canvas renderer

| Capability | React (file) | Ours (file) | Status | Note |
|---|---|---|---|---|
| `render` (default CSF 3) | `render.tsx` | `src/renderer/shared/default-render.ts` | ✓ | Same error text. |
| `renderToCanvas` | `renderToCanvas.tsx`: act queue, error boundary, `forceRemount` keying, StrictMode | `shared/render-to-canvas.ts` + `solid2.ts` / `solid1.ts` shells: mount once, stores | divergent (by design) | |
| Teardown act fix | async `act` on unmount (#36608) | — | N/A | No act in Solid. |
| `mount` | `mount.ts` | `shared/mount.ts` (+ store sync, `forceRemount`, `flush`) | ✓ | |
| `applyDecorators` | `applyDecorators.ts` + docs reorder for `jsxDecorator` | `shared/apply-decorators.ts` (JSX-decorator skip) | ✓ / divergent | |
| `beforeAll` (`storybook/test` configure) | `entry-preview.tsx` with act wrappers | `shared/before-all.ts` macrotask flush | ✓ | |
| `parameters.renderer` / `STORYBOOK_ENV` | `'react'` | `'solid2'` / `'solid1'` | divergent | Nothing in core or addons reads `STORYBOOK_ENV` at beta.0 (grep). |
| RSC decorator, `experimentalRSC`, `parameters.react.rootOptions` | `entry-preview.tsx`, `entry-preview-rsc.tsx` | — | N/A | |
| `test-fn` without flag guard | `entry-preview.tsx` decorator | — | divergent | See preset row. |

### CSF Next (`definePreview`)

| Capability | React (file) | Ours (file) | Status | Note |
|---|---|---|---|---|
| Renderer annotations composed first | `__definePreview` adds `entry-preview`, `-argtypes`, `-docs` | `createSolidDefinePreview` adds `previewAddon`, `renderer/docs` | ✓ | |
| `story.Component` | `story.__compose()` | `createReactiveStoryComponent` (live props through `mergeProps` / `merge`) | divergent (by design) | |
| `addons` typing | `{ addons: Addons } & …`, `Addons extends PreviewAddonEntry[]`, addons **required** (764698836a) | `addons?: Addons`, `Addons extends PreviewAddon<never>[] = []` | **gap** | Legacy namespace addons (`import * as x from 'addon/preview'`) do not typecheck, and the shape differs from core. S |
| `preview.type<R>()` | `ReactPreview.type` | `SolidPreview.type` | ✓ | |
| `preview.meta` arg typing | `MetaInput<…, TMetaArgKeys>` → `ReactMeta<MetaTypes<…>, TMetaArgKeys>`. Keys are tracked, values checked with `NoInfer`, so no `as const` is needed and every key must be an arg | `TMetaArgs extends Partial<TArgs & T['args']>` inferred from values. `SolidMeta<T, MetaInput>` passes an object where core's `Meta` expects `TMetaArgKeys` (hidden by `@ts-expect-error`) | **gap** | The SB 11 MIGRATION "CSF Next" entries (no `as const`, every key must be an arg, `mocked()`) do not hold for Solid. M |
| `meta.story` overloads | `StoryArgs<T['args'], TMetaArgKeys>` | `SetOptional` + `AddMocks` | **gap** | Same root cause. |
| `meta.type<S>()` | `ReactMeta.type` → `ReactMeta<T & S, TypedMetaArgKeys<…>>` | Inherited from core `Meta`, returns core `Meta` | **gap** | After `.type<>()` you lose `SolidMeta.story` overloads and `story.Component`. S once the item above lands. |
| `.extend`, `.test`, `.run`, `.input`, `.composed`, `.play` | core `Story` | Inherited via `SolidStory extends Story` | ✓ | |
| Custom tags autocompletion (#35812) | Through core `AddonTypes.tags` | Should flow through `SolidTypes & T` | ✓ (untested) | Add a type test like `react-vite/src/define-preview.test.ts`. |

### CSF 3 public types

| Capability | React | Ours (`src/preview/public-api.ts`) | Status | Note |
|---|---|---|---|---|
| `Meta`, `StoryFn`, `StoryObj` (+ `AddMocks`) | `public-types.ts` | same pattern | ✓ | |
| `Decorator`, `Loader`, `StoryContext`, `Preview` | `public-types.ts` | `Decorator` (+ `__isJSX`), `Loader`, `StoryContext` (+ `renderToCanvas`), `Preview`, `RenderContext` | ✓ | |
| Renderer type | `ReactRenderer.component: ComponentType<this['T']>` | `SolidRenderer.component: SolidComponent<any>` | divergent (minor) | React's `this['T']` form is what core uses for higher-kinded inference. |
| `XTypes` with parameters | `ReactTypes` | `SolidTypes` | ✓ | |
| `Args`, `ArgTypes`, `Parameters`, `StrictArgs` re-exports | ✓ | ✓ | ✓ | |
| Decorator helpers | — | `createJSXDecorator`, `createDecorator` | Solid-only | |

### Portable stories and testing

| Capability | React (file) | Ours | Status | Note |
|---|---|---|---|---|
| `setProjectAnnotations`, `composeStory`, `composeStories`, `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` | `portable-stories.tsx` (exported from `.`) | none | **gap** | addon-vitest does not need them; it applies presets itself and now throws if `setProjectAnnotations` runs in a setup file. SB 11 MIGRATION says plain Vitest, Jest and other runners still need the call. Without renderer defaults, `composeStory` from `storybook/preview-api` has no Solid `render` / `renderToCanvas`. S/M |
| addon-vitest support | `SUPPORTED_FRAMEWORKS` includes react-vite | Includes `SupportedFramework.SOLID` (`core/src/cli/AddonVitestService.constants.ts`) | ✓ | |
| Ghost stories / component-test transform (`internal_getArgTypesData`) | ✓ | Broken by the absolute-path bug above | **gap** | |

### Docs annotations and source

| Capability | React (file) | Ours (`src/renderer/docs.ts`) | Status | Note |
|---|---|---|---|---|
| `enhanceArgTypes`, `extractComponentDescription` | `entry-preview-argtypes.ts` | ✓ | ✓ | |
| Runtime `extractArgTypes` from `__docgenInfo` | `entry-preview-argtypes.ts` | none | N/A | No `__docgenInfo` inject by design. |
| `docs.story.inline: true` | `entry-preview-docs.ts` | ✓ | ✓ | |
| Dynamic source (`jsxDecorator`) when server snippets are off | `entry-preview-docs.ts` | none | N/A / divergent | Solid output cannot be serialized back to JSX. With `docgen: false`, Solid has no generated snippets at all. |
| `controls.matchers` | Not in renderer; `create-storybook` writes them into `preview` | Set in `renderer/docs.ts` | divergent (harmless) | |

### Templates and CLI (`create-storybook --type=solid`)

| Capability | React | Ours (`template/cli`) | Status | Note |
|---|---|---|---|---|
| Template discovery | `getRendererDir` → package `template/cli/{ts,js}` | `frameworkPackages['storybook-solidjs-vite'] = SOLID`, `hasFrameworkTemplates` includes `SOLID` | ✓ | |
| `SupportedFramework.SOLID`, `SupportedRenderer.SOLID`, `ProjectType.SOLID`, generator `generators/SOLID/index.ts` (builder Vite, `addComponents`) | — | present in beta.0 core | ✓ | No change since alpha.6. |
| Story format | CSF 3 (`export default meta`, `StoryObj`, `play`) | CSF Next (`preview.meta()`, `.test()`), imports `../../.storybook/preview` | **gap (likely broken)** | `configurePreview` (`lib/create-storybook/src/generators/configure.ts`) writes `.storybook/preview.tsx` as `const preview: Preview = {…}; export default preview`, with no `definePreview`. Nothing in create-storybook converts it. `preview.meta` is then undefined. The relative path is also wrong when there is no `src/`: stories land in `./stories`, so `../../.storybook` points outside the project. Our own `template/cli/*/preview.*` was deleted in `65defe3`. M |
| JS templates typed with JSDoc so server docgen shows prop types | #37082: `@param` JSDoc on `Button.jsx`, `Header.jsx` | `js/Button.jsx`, `js/Header.jsx` have no prop JSDoc | **gap** | JS init projects get empty prop types and descriptions under server docgen. S |
| TS templates with prop doc comments | `ts/Button.tsx` documents every prop | `ts/Button.tsx`, `ts/Header.tsx` have no prop comments | **gap** | The Docs table shows no descriptions. S |
| Header `user` default, required callbacks (#37082) | `user` optional with no `null` default, callbacks required | Callbacks required, `user?: … \| undefined` | ✓ | |

## Prioritized gap list

| # | Gap | Size | Why |
|---|---|---|---|
| 1 | Remove `storybook/internal/babel` from the five server files (land PR #76 and fix its two defects) | L | beta.0 blocker: docgen worker and story docs fail to import. |
| 2 | Fix the scaffold. Option A: ship `.storybook/preview` as part of the template and point stories at it reliably. Option B: switch `template/cli` to CSF 3 like React. Option C: upstream a CSF Next path to `create-storybook` | M | `create-storybook --type=solid` likely produces stories that throw. Not run; verify with a fresh init. |
| 3 | `internal_getArgTypesData`: handle absolute paths, resolve against `getProjectRoot()` | S | addon-vitest passes absolute ids; component-test argTypes are always `null`. |
| 4 | Add a `"./node"` export (same target as the `node` condition) | S | `storybook automigrate csf-factories` writes `storybook-solidjs-vite/node`. |
| 5 | Rebase `SolidPreview` / `SolidMeta` / `SolidStory` on core `MetaInput`, `MetaTypes`, `StoryArgs`, `TypedMetaArgKeys`, `PreviewAddonEntry`; add `meta.type<S>()`; make `addons` required; drop the `@ts-expect-error`s. Mirror React's `preview.tsx` | M | Matches the SB 11 MIGRATION CSF Next behaviour. Breaking type change; needs a changeset and a MIGRATION note. |
| 6 | Story-docs payload: `import` block, `summary`, `warning` (unresolved), imported-story references | S–M | Copied snippets miss imports; MCP and docs get less. Partly overlaps #1. |
| 7 | Docgen payload: meta JSDoc description + `summary` via `extractComponentDescription`; `error` payload when no component; use `getComponentIdFromEntry` | S | Parity with the manifest debugger and MCP. |
| 8 | Portable stories: `setProjectAnnotations`, `composeStory`, `composeStories` with Solid default annotations | S/M | Plain Vitest, Jest and Playwright CT users. |
| 9 | JS/TS templates: JSDoc prop types and descriptions | S | Server docgen in JS init projects. |
| 10 | `experimentalCodeExamples` default: drop it, or make the story-docs provider honour it; fix README | S | It currently does nothing, and the README claims it disables snippets. |
| 11 | Import strings: publishable-package rewriting (`getImportablePackageName`) | M | MCP / docs import accuracy for design-system packages. |
| 12 | Adopt core `storybook/internal/component-meta` base classes and core `extractDeclaredSubcomponents` | L | Less duplicated code, inherit core fixes. Not urgent. |
| 13 | Guard `.test()` stories when `experimentalTestSyntax` is off; type test for custom tags | S | Low. |
| 14 | Decide on `optimizeViteDeps` for `@solidjs/web` / `solid-js` | S | Only if a Vitest-browser reload is observed. |

## Constraints

- Solid has no `act`, no StrictMode, no RSC, and no way to serialize rendered output to JSX. React's act, RSC and `jsxDecorator` features are N/A.
- Docgen is server-only by design (AGENTS.md). Builder-docgen paths (`react-docgen`, RDT, `enrichCsf`) are N/A.
- Peer floor is still `storybook@^11.0.0-0`, but the lockfile is at alpha.6. Items 1, 3 and 5 interact with the trial upgrade the other agent is running.

## Sources (read 2026-11-04)

- Storybook clone `v11.0.0-beta.0`:
  - `code/renderers/react/{package.json,src/preset.ts,src/preview.tsx,src/public-types.ts,src/types.ts,src/entry-preview*.ts*,src/portable-stories.tsx,src/mount.ts,src/render.tsx,src/applyDecorators.ts,src/enrichCsf.ts,src/docgen/*,src/componentManifest/{generator,buildReactComponentDocgen,resolveComponents,generateCodeSnippet}.ts}`
  - `code/frameworks/react-vite/{package.json,src/*}`
  - `code/core/src/csf/csf-factories.ts`, `code/core/src/core-server/presets/common-preset.ts`, `code/core/src/types/modules/core-common.ts`, `code/core/src/shared/open-service/services/story-docs/{types,snippet}.ts`, `code/core/src/component-meta/*`, `code/core/src/cli/{helpers,dirs}.ts`
  - `code/lib/create-storybook/src/generators/{SOLID/index.ts,baseGenerator.ts,configure.ts}`
  - `code/lib/cli-storybook/src/codemod/{csf-factories.ts,helpers/config-to-csf-factory.ts}`
  - `code/addons/vitest/src/vitest-plugin/index.ts`
  - `MIGRATION.md`
- This repo (`next` @ `aad4d49`): `package.json`, `src/**`, `template/cli/**`, `README.md`, `MIGRATION.md`, `.briefback/docs/framework/*.md`, `.briefback/sb11-estree-csf-tools/handoff.md`.

## Observed vs inferred

- **Observed** (code read):
  - Every import, export, flag default and type shape in the tables.
  - Babel is absent at beta.0.
  - `configurePreview` writes a CSF 3 preview.
  - The codemod emits the `/node` subpath.
  - addon-vitest passes absolute ids.
  - `experimentalCodeExamples` is read only by React.
- **Inferred** (not run):
  - The scaffold throws at story import.
  - `getArgTypesData` returns `null` under addon-vitest.
  - The Solid `optimizeViteDeps` question.
  - The custom-tags typing flows through.

## Open questions

- Does PR #76 pass `filePath` + `createStoryReferenceResolver()` into `createStoryArgsResolver`? That decides whether the imported-story fixes from #36746 come for free.
- Template direction: keep CSF Next (we would own `.storybook/preview`, or need an upstream create-storybook change) or match React's CSF 3?
- Should `docgen: false` keep a CSF-only snippet path (`experimental_enrichCsf`-style), given there is no runtime `jsxDecorator`?
