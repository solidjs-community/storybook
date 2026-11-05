# Manifests and snippets

Components manifest generation, and the story docs payload behind Autodocs “Show code”.

See also: [modules index](./modules.md), [docgen](./docgen.md).

## Components manifest

With `docgenServer` on (default), `generateComponentManifests` returns an empty `components` map and keeps `meta.docgen: 'react-component-meta'`. Storybook core builds the ref-based `v: 1` manifest from docgen / story-docs snapshots.

Engine id reported to the UI is `react-component-meta` (`MANIFEST_DOCGEN_ENGINE`); internal name is `solid-component-meta`.

## Story docs

`experimental_storyDocsProvider` (renderer preset) builds one payload per story file, following React's `docgen/story-docs-preset.ts`. Core only calls it when `docgenServer` is on, so `framework.options.docgen: false` turns story docs off as well. Files that do not match `STORY_FILE_TEST_REGEXP` go to the next provider. Our payload is spread over the downstream one; if building ours throws, the downstream payload is returned unchanged.

| Field     | Value                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- |
| `id`      | `getComponentIdFromEntry(entry)`                                                            |
| `name`    | `meta.component`, else the title's last segment with spaces removed (like React)            |
| `path`    | the story import path                                                                       |
| `import`  | the file's import block, which core prepends to every snippet                               |
| `stories` | by story id: `name`, `description`, `summary`, `snippet`, `warning`, or a per-story `error` |

`description` and `summary` (`@summary`) come from story JSDoc via core's `extractStoryJSDocInfo`. A story whose docs throw carries `error` instead of failing the file.

### `experimentalCodeExamples`

On by default from the [preset](./preset-and-version.md). With `features.experimentalCodeExamples: false`, stories carry no `snippet`, the payload no `import`, and component resolution is skipped. Descriptions and summaries are still served. This differs from React at beta.0, whose story-docs provider ignores the flag.

### Snippets

`getCodeSnippet` (`src/internal/codeExamples/generateCodeSnippet.ts`) reads the story through Storybook's ESTree `csf-tools` and edits the story's source text instead of reprinting an AST, so code keeps the user's formatting. It returns `code`, the `imports` arg values still need, and the `unresolved` names. Story-shape reading uses core's helpers, the same ones React's generator uses:

- Args: `createStoryArgsResolver` merges meta and story args through local constants, spreads, `Story.args = …` assignments (last write replaces, no deep merge) and story aliases. `createStoryReferenceResolver` (one per process, shared module-resolution cache) follows stories imported from other files, such as `...Base.args`.
- Render: `normalizeStoryDeclaration` + `resolveRenderFunction`. A story function or story `render` is used as is, with the args it reads inlined; the meta `render` is used only when the story has none. A rewritten render keeps every parameter its body still reads (`(args, context) => …`).
- No render: `<Component {...args} />` with args as attributes and `children`. Multi-line values are reindented to the line they land on. The component name is the matched component (see [docgen](./docgen.md#server-path-default)) or `meta.component`.
- `Template.bind({})` of an imported template calls that template with the args and adds its import.

When resolved args still name something no static pass can read, the snippet is kept and the story gets core's `unresolvedWarning(unresolved)` as `warning`, like React at beta.0.

### Import block

`buildImportStatements` over every component the file uses plus the arg-value import refs. `getImportablePackageName` finds the nearest `package.json` above the documented component (or the story file): a package that is not private, or that has a root entry (`exports["."]`, a condition map, or a main field), is importable, and component imports are rewritten to its name (React #36676). App-private packages keep the story's own import. Arg-value refs are marked `isPackage` so they keep the module they were imported from. If no statement comes out, a fallback `import { X } from '<package>'` is used.

## Key modules and tests

- `src/internal/componentManifest/manifests.ts`
- `src/internal/componentManifest/docgen/storyDocsProvider.ts`
- `src/internal/codeExamples/generateCodeSnippet.ts`
- `src/internal/componentManifest/getComponents.ts` (`getImportablePackageName`, `getFallbackImport`)
- `src/spec/componentManifest/manifests.test.ts`, `src/spec/componentManifest/storyDocsProvider.test.ts`
- `src/spec/codeExamples/**`
