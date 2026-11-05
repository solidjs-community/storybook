# React parity

Where `storybook-solidjs-vite` stands against `@storybook/react` + `@storybook/react-vite`, the reference implementation for Storybook frameworks. Snapshot: Storybook `11.0.0-beta.0` (2026-11-05).

The rule: match React wherever a feature applies to Solid; diverge only where Solid has no equivalent, and write the reason down here.

See also: [modules index](./modules.md).

## At parity

| Area                                       | Ours                                                                                                                                                                                                  | React counterpart (`code/renderers/react/src/…`)                        |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Story file reading                         | ESTree `storybook/internal/csf-tools` helpers (`createStoryArgsResolver`, `normalizeStoryDeclaration`, `resolveRenderFunction`, `staticKey`)                                                          | `componentManifest/generateCodeSnippet.ts`                              |
| Code snippets                              | Kept with core's `unresolvedWarning` when values name things the snippet lacks; stories from other files resolve via `createStoryReferenceResolver`                                                   | same                                                                    |
| Story docs payload                         | `import` block, `summary`, `description`, `warning` ([manifests and snippets](./manifests-and-snippets.md))                                                                                           | `componentManifest/resolveComponents.ts`, `docgen/story-docs-preset.ts` |
| Component docgen payload                   | Meta + component JSDoc description, `summary`, React's `error` payloads, `id` from `getComponentIdFromEntry`, `path` = story import path, subcomponents named by declared key ([docgen](./docgen.md)) | `componentManifest/buildReactComponentDocgen.ts`                        |
| Package-name imports                       | `getImportablePackageName` in `src/internal/componentManifest/getComponents.ts` (local copy; React keeps it private)                                                                                  | `buildReactComponentDocgen.ts`                                          |
| Component matching                         | `meta.component`, else by story title                                                                                                                                                                 | `resolveComponents.ts`                                                  |
| Component meta base                        | `SolidComponentMetaManager` / `SolidComponentMetaProject` extend core's `ComponentMetaManager` / `ProgramBackedProject`                                                                               | React's docgen manager                                                  |
| `internal_getArgTypesData`                 | Absolute paths as given, relative ones against `getProjectRoot()`                                                                                                                                     | `preset.ts`                                                             |
| CSF Next types                             | `SolidPreview` / `SolidMeta` / `SolidStory` on core's `MetaInput`, `MetaTypes`, `StoryArgs`, `meta.type<>()`, required `addons` ([preview and CSF](./preview-and-csf.md))                             | `preview.tsx`                                                           |
| Portable stories                           | `setProjectAnnotations`, `composeStory`, `composeStories`, `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` (`src/preview/portable-stories.ts`)                                                                 | `portable-stories.tsx`                                                  |
| `main.ts` entry                            | `storybook-solidjs-vite/node` (what the `csf-factories` codemod writes)                                                                                                                               | `react-vite` `./node`                                                   |
| `.test()` without `experimentalTestSyntax` | Throws React's error (`src/renderer/shared/test-syntax-guard.ts`)                                                                                                                                     | `entry-preview.tsx`                                                     |
| Template prop docs                         | JSDoc on `template/cli` components (#37082)                                                                                                                                                           | `template/cli`                                                          |

## Deliberate differences

| Ours                                                                                                 | React                                                | Why                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docgen only on the Storybook server; `framework.options.docgen: false` turns it off                  | Falls back to builder docgen (react-docgen)          | No `__docgenInfo` inject by design; builder paths (`enrichCsf`, RDT) are N/A                                                                                                                                                                                                              |
| Bundled `@typescript/typescript6`, `typescript` an optional peer                                     | Required `typescript` peer, warns when unusable      | Docgen never loads the user's TypeScript                                                                                                                                                                                                                                                  |
| `features.experimentalCodeExamples: false` drops snippets from story docs                            | Ignored under `docgenServer`                         | Chosen so the flag is a working off switch; descriptions and summaries are still served                                                                                                                                                                                                   |
| Our tsconfig lookup (`findTsConfigForFile.ts`) through core's private `getOrCreateConfiguredProject` | Core's lookup                                        | Core falls back to an inferred project and drops `paths` / JSX options in common monorepo layouts. A spec fails if core renames the hook                                                                                                                                                  |
| No `optimizeViteDeps`                                                                                | Prebundles `react`, `react-dom`, `react/jsx-runtime` | Solid ships ESM and both Solid Vite plugins prebundle the runtime. A cold-cache lab Vitest run showed no reload (2026-11-05)                                                                                                                                                              |
| `template/cli` stories are CSF Next                                                                  | CSF 3                                                | Kept on purpose until Storybook moves React templates and `create-storybook` to CSF Next. Until then `create-storybook --type=solid` writes a CSF 3 `preview`, so the scaffold's `preview.meta()` stories have no CSF Next preview to call (read from `create-storybook`'s code, not run) |
| Renderer split by Solid major (`renderer/solid1`, `renderer/solid2`)                                 | Split by concern (`entry-preview*`)                  | One adapter serves Solid 1 and 2                                                                                                                                                                                                                                                          |
| N/A: act, StrictMode, RSC, `jsxDecorator` dynamic source                                             | —                                                    | Solid has no equivalent; rendered output cannot be serialized back to JSX                                                                                                                                                                                                                 |

## Known gaps

- **Solid 1 portable stories in plain Vitest** need user config: alias `storybook-solidjs-vite/renderer/preview-addon` to `…/renderer/solid1` and `server.deps.inline: ['storybook-solidjs-vite']` (README). A small Vitest plugin could do both.
- **Story docs `import` field** is marked for removal in core's story-docs README. We set it because React still does; drop it when React does.
- **Lint** checks no `.ts`: typescript-eslint rejects TypeScript 7. Typecheck is the gate.

## Next Storybook update

Diff these paths between the old and new Storybook tag and mirror what applies:

- `code/renderers/react/src/{preset.ts,preview.tsx,portable-stories.tsx,entry-preview*.ts*,componentManifest/*,docgen/*}`
- `code/frameworks/react-vite/{package.json,src/*}`
- `code/core/src/{csf-tools,component-meta,csf/csf-factories.ts}` and `code/core/src/shared/open-service/services/story-docs/*`
- `code/lib/create-storybook/src/generators/{SOLID/index.ts,configure.ts}` and `code/renderers/react/template/cli`
- `MIGRATION.md` (it lists `storybook-solidjs-vite` among community packages)

Then bump `storybook` everywhere (root, `examples/lab`, `examples/solid1`) and run the checks in [examples and CI](./examples-and-ci.md).
