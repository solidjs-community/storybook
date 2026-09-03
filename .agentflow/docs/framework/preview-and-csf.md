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

Root `definePreview` is bound to `preview-addon`, which the [preset](./preset-and-version.md) aliases to Solid 1 or 2.

## Key modules

- `src/preview/public-api.ts`
- `src/preview/define-preview.ts`
- `src/index.ts`
- `src/renderer/docs.ts`
- `src/renderer/preview-addon.ts`
