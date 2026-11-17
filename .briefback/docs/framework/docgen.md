# Docgen

How Controls, Docs, and related tooling get Solid component props on the `next` line.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md), [manifests and snippets](./manifests-and-snippets.md).

## Server path (default)

`features.docgenServer` is on by default. Core turns it on when the preset exports `isDocgenProviderEnabled`. Storybook loads `experimental_docgenProvider` → `./internal/docgen-worker`. There is **no** Vite `__docgenInfo` inject.

The worker follows `@storybook/react`'s docgen worker (`code/renderers/react/src/docgen/*`):

1. Read the story import path from the index entry (`getStoryImportPathFromEntry`) and parse the file with `loadCsf` from Storybook's ESTree `storybook/internal/csf-tools`. There is no Babel: Storybook 11 removed `storybook/internal/babel`.
2. Collect components with `getComponents`: capitalized and member JSX names, `meta.component`, and the declared subcomponents from core's `extractDeclaredSubcomponents` (`storybook/internal/common`). Imports resolve through `collectImportBindings` plus `import X = require('…')` and `import X = NS.Y` (when `NS` is a namespace import). Names declared in the file are dropped.
3. Pick the documented component with `findMatchingComponent`: the one `meta.component` names, else, like React, the one the title names, preferring the outermost in the story JSX. Story docs use the same match.
4. Extract with `SolidComponentMetaManager`, passing the arg names the file sets (`collectCsfArgNames`, which reads every key core's `staticKey` accepts: identifiers, strings, computed string/template keys, numbers).
5. Map to argTypes (`toDocgenInfo.ts`) and build the payload.

Any throw in the worker returns `undefined`, so core falls through to other providers.

## Payload

Shaped like React's `buildDocgen.ts` and core's `DocgenPayload` type:

| Field                     | Value                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                      | `getComponentIdFromEntry(entry)`                                                                        |
| `name`                    | the component name                                                                                      |
| `path`                    | the **story** import path (core's contract), not the component file                                     |
| `description` / `summary` | `extractComponentDescription(metaJsDoc, componentJsDoc, tags)`: the meta docblock wins, `@summary` kept |
| `jsDocTags`               | the component's JSDoc tags                                                                              |
| `argTypes`                | Controls data from `toDocgenInfo.ts`                                                                    |
| `reactComponentMeta`      | the raw `SolidComponentDoc`                                                                             |
| `subcomponents`           | keyed by the declared key, when any were declared                                                       |

The component itself carries no `import`; [story docs](./manifests-and-snippets.md) serve the file's import block.

Subcomponents are named by their declared key (`{ Header: Card.Header }` documents `Header`). Each has `path` = its component file and an `import`: by the documented component's package name when that package is importable (`getImportablePackageName`), else as the story imports it. A subcomponent that resolves but has no path or import is left out.

### Errors

Instead of returning nothing, the worker returns React's `error` payload:

- `No component found` — no `meta.component`, and no title-matched component could be extracted.
- `No component import found` — `meta.component` is set, but no component file could be resolved or extracted for it.
- A declared subcomponent with no matching component gets its own `No component import found` entry under `subcomponents`.

The top-level messages carry a code frame at the meta (`storyShapeError`) and the story file source. Error payloads use the title's last segment as `name` when there is no `meta.component`.

## Disable

```ts
framework: {
  name: 'storybook-solidjs-vite',
  options: { docgen: false },
}
```

That turns off `docgenServer` from the framework preset, so the worker is not registered. Core also skips story docs, so snippets go too.

## Extractor

`SolidComponentMetaManager` extends core's `ComponentMetaManager` (`storybook/internal/component-meta`), the base React's docgen uses. Core owns the project cache, file watching and heap-pressure recycling, including the warning text. `SolidComponentMetaProject` extends core's `ProgramBackedProject` and uses its `ProjectFileTracker` for snapshots; it builds a Volar-backed TypeScript LanguageService on the bundled `@typescript/typescript6`, so the user's `typescript` peer (possibly 7, with no programmatic API) does not matter. Component JSDoc comes from core's `extractComponentJsDocInfo`.

The tsconfig lookup stays ours (`findTsConfigForFile.ts`): the closest `tsconfig.json` / `jsconfig.json` that includes the file, directly or through project `references`, else the closest one. Core's lookup falls back to an inferred project, which drops the user's `paths` and JSX options. `getProjectForFile` fills core's private `getOrCreateConfiguredProject` cache; the call is optional, so if core renames it docgen falls back to core's lookup instead of crashing. `tsconfigProjectReferences.test.ts` pins that the hook exists. A file with no tsconfig above it gets an inferred project with `strict`, `esModuleInterop`, `allowJs`, `skipLibCheck` and `jsx: preserve`.

Solid-specific parts: prop resolution (`resolveProps.ts`), filtering inherited DOM noise while keeping `class` / `style` and args-referenced names (`domProps.ts`), serialization, and discriminated unions as Controls `if` (`discriminatedUnion.ts`).

## `getArgTypesData`

Exported from the renderer preset as `internal_getArgTypesData`: a one-shot extract for MCP, story-creation tooling and `@storybook/addon-vitest`. Absolute component paths (what addon-vitest passes) are used as is; relative ones resolve against `getProjectRoot()`, which is the git root. `bun run check-docgen` passes absolute paths for that reason.

## Key modules and tests

- `src/internal/componentManifest/docgen/*`
- `src/internal/componentManifest/getComponents.ts`, `collectCsfArgNames.ts`
- `src/internal/componentManifest/solidComponentMeta/*`
- `src/internal/componentManifest/toDocgenInfo.ts`
- `src/internal/componentManifest/manifests.ts` (`getArgTypesData`)
- `src/framework/docgenOption.ts`
- `src/spec/componentManifest/**` (`docgenWorker.test.ts`, `solidComponentMeta/*`)
- `src/spec/framework/*`
