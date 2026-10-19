# Preview types and CSF

Public preview types, CSF 3 helpers, decorator markers, and CSF Next `definePreview`.

See also: [modules index](./modules.md), [canvas renderer](./canvas-renderer.md).

## Renderer contract

`SolidRenderer` (`src/preview/public-api.ts`) extends Storybook `WebRenderer`:

- `component` — Solid `Component`
- `storyResult` — JSX return type
- `mount` — play/test mount returning a `Canvas`

`parameters.solid` is currently an empty placeholder (`Record<string, never>`).

## CSF 3

`Meta`, `StoryFn`, and `StoryObj` follow the React adapter pattern: pass a component to infer props; `StoryObj` merges meta args and mock-fn “AddMocks”.

## Decorators

Storybook re-invokes decorators when args/globals change (React model). Solid keeps one tree and updates stores, so JSX wrappers that remount would duplicate DOM.

| Helper               | Use when                                                     |
| -------------------- | ------------------------------------------------------------ |
| `createJSXDecorator` | Decorator returns JSX — run once per story mount (`__isJSX`) |
| `createDecorator`    | Side effects only — run every update                         |

Prefer the helpers over setting `__isJSX` by hand. How the flag is honored at runtime is described in [canvas renderer](./canvas-renderer.md).

## CSF Next

`createSolidDefinePreview` (`src/preview/define-preview.ts`) wraps Storybook’s CSF `definePreview`:

1. Always prepends the Solid renderer addon and `src/renderer/docs.ts`
2. Appends user `addons`
3. Patches `meta.story()` so each story exposes `story.Component` (composed story as a Solid component) for JSX composition

Root `definePreview` is that factory bound to `renderer/solid-legacy`, which the [preset](./preset-and-version.md) aliases to `solid-next` on Solid 2.

## Key modules

- `src/preview/public-api.ts`
- `src/preview/define-preview.ts`
- `src/index.ts`
- `src/renderer/docs.ts`
