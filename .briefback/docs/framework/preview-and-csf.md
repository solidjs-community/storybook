# Preview types and CSF

Public preview types, CSF 3 helpers, decorator markers, and CSF Next `definePreview`.

See also: [modules index](./modules.md), [canvas renderer](./canvas-renderer.md).

## Renderer contract

`SolidRenderer` (`src/preview/public-api.ts`) extends Storybook `WebRenderer`:

- `component` — Solid `Component`
- `storyResult` — JSX return type
- `mount` — play/test mount returning a `Canvas`

## CSF 3

`Meta`, `StoryFn`, and `StoryObj` follow the React adapter pattern: pass a component to infer props; `StoryObj` merges meta args and mock-fn “AddMocks”.

## Decorators

| Helper               | Use when                                                     |
| -------------------- | ------------------------------------------------------------ |
| `createJSXDecorator` | Decorator returns JSX — run once per story mount (`__isJSX`) |
| `createDecorator`    | Side effects only — run every update                         |

## CSF Next

`createSolidDefinePreview` wraps Storybook’s CSF `definePreview`, always composing the Solid renderer addon and docs annotations, then user addons. `meta.story()` adds `story.Component` for JSX composition.

Types mirror `@storybook/react`'s `preview.tsx`: `addons` is required (`PreviewAddonEntry[]`, so namespaces work), `preview.meta()` takes core's `MetaInput` and tracks the meta's arg keys (`TMetaArgKeys`), story overloads use `StoryArgs`, and `meta.type<S>()` returns a `SolidMeta`. Unlike React, the args overload of `SolidMeta.story` has no `Simplify<>` around its constraint: under `exactOptionalPropertyTypes` it fails `Story`'s `TInput` constraint. Type tests: `src/spec/preview/csf-factories.test.ts`.

Root `definePreview` is bound to `preview-addon`, which the [preset](./preset-and-version.md) aliases to Solid 1 or 2.

## Portable stories

`src/preview/portable-stories.ts` mirrors `@storybook/react`'s `portable-stories.tsx`. `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` composes `preview-addon` and `renderer/docs`, the same pair `definePreview` adds. `composeStory` falls back to it when `setProjectAnnotations` has not run. Unlike React, `composeStories` types accept a module with no `default` (CSF Next) and map its `meta.story()` exports. Runtime test: `src/spec/preview/portable-stories.test.ts` (happy-dom).

## Key modules

- `src/preview/public-api.ts`
- `src/preview/define-preview.ts`
- `src/preview/portable-stories.ts`
- `src/index.ts`
- `src/renderer/docs.ts`
- `src/renderer/preview-addon.ts`
