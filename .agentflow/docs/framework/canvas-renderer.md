# Canvas renderer

How stories mount into the preview iframe once, then update through Solid stores instead of remounting.

See also: [modules index](./modules.md), [preview and CSF](./preview-and-csf.md), [preset and version](./preset-and-version.md).

## Shared vs versioned

Orchestration lives in `src/renderer/shared/`. Version files (`solid-next.ts`, `solid-legacy.ts`) only supply Solid APIs and the story shell (error boundary / settled hooks).

Each version registers a preview addon with: `renderToCanvas`, default `render`, `applyDecorators`, play `mount`, `beforeAll`, and `parameters.renderer`. Both set `window.STORYBOOK_ENV` to that renderer id when `window` exists.

## Mount once

`createRenderToCanvas`:

- First pass for a story id: build a version-specific App, `render()` into `canvasElement`, store dispose
- Later Storybook passes: call `StoryFn()` again so context is re-read — **do not** call `render()` again
- Cleanup: dispose and reset that story id

Story id prefers `canvasElement.id` (inline Docs canvases) unless missing or `storybook-root`, then `context.id`.

## Reactive args and globals

`createStoryState` keeps a per-story args store and a shared globals store. `makeContextReactive` writes Storybook’s latest values into the stores, then replaces `context.args` / `context.globals` with the store proxies so JSX bindings stay live.

- Solid 2: `createStore` from `solid-js`
- Solid 1: `solid-js-legacy/store` + `reconcile` on each update

JSX decorators that close over non-reactive values will go stale; they must read `context.args` / `context.globals` as stores.

## JSX decorator skip

`createApplyDecorators`: decorators flagged `__isJSX` skip their wrapper after first render and only call `StoryFn`. After mount, the inner story function returns `null` so Storybook’s decorate pipeline does not rebuild the tree. Non-JSX decorators always run.

## Default CSF 3 render and play

- `createDefaultRender` — `createComponent(component, args)`; missing `component` throws
- `createMount` — optional `ui` replaces `originalStoryFn`; `forceRemount` disposes; then reactive context + `renderToCanvas`

## Version shells

|                       | Solid 2 (`solid-next`)  | Solid 1 (`solid-legacy`)                  |
| --------------------- | ----------------------- | ----------------------------------------- |
| Render                | `@solidjs/web`          | `solid-js-legacy/web`                     |
| Errors / settled      | `Errored` + `onSettled` | `ErrorBoundary` + `onMount` / `onCleanup` |
| `parameters.renderer` | `solid-next`            | `solid`                                   |

`definePreview` always imports `solid-legacy`; on Solid 2 the preset aliases that import to `solid-next`. Preview annotations also pick the entry from `resolveSolidRendererEntry`.

## Interaction tests and docs defaults

`beforeAll` wraps `storybook/test` async play steps with a macrotask so Solid can flush. Missing `storybook/test` is a no-op.

`src/renderer/docs.ts`: color/date control matchers, inline stories, `enhanceArgTypes`.

## Key modules and tests

- `src/renderer/solid-next.ts`, `src/renderer/solid-legacy.ts`
- `src/renderer/shared/*`
- `src/spec/renderer/*`
