# Package surface

How the published package splits environments so Node config, the preset, and the preview renderer do not load each other’s world.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md).

## Why the split exists

`.storybook/main.ts` must resolve framework types without pulling Solid canvas code. The preview iframe must load the renderer without Node-only docgen. Optional experimental docgen loads a worker via `./internal/docgen-worker`.

## Entries

| Capability                                    | Export / entry                                     |
| --------------------------------------------- | -------------------------------------------------- |
| CSF types, `definePreview`, decorator helpers | `.` → `src/index.ts`                               |
| `StorybookConfig` / `defineMain` only         | Node condition → `src/node.ts`                     |
| Preset (`core`, `features`, `viteFinal`)      | `./preset`, `./next/preset`                        |
| Renderer hooks Storybook core loads           | `./renderer`                                       |
| Solid 2 / Solid 1 canvas addon                | `./renderer/solid-next`, `./renderer/solid-legacy` |
| Docs/Controls preview annotations             | `./renderer/docs`                                  |
| Docgen worker (experimental server path)      | `./internal/docgen-worker`                         |

## How `definePreview` stays version-agnostic

`src/index.ts` always builds `definePreview` from `storybook-solidjs-vite/renderer/solid-legacy`. When the consumer has Solid 2, [viteFinal](./preset-and-version.md) aliases that specifier (and its resolved file URL) onto `solid-next`. One public API, two runtimes.

`optimizeDeps.exclude` includes `storybook-solidjs-vite` so Vite does not prebundle a second Solid into the preview.

## Key modules

- `package.json` — `exports`
- `src/index.ts` — root preview entry
- `src/node.ts` — Node / `main.ts` entry
