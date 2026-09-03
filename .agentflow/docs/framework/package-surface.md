# Package surface

How the published package splits environments so Node config, the preset, the preview renderer, and the docgen worker do not load each other’s world.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md).

## Entries

| Capability                                    | Export / entry                                     |
| --------------------------------------------- | -------------------------------------------------- |
| CSF types, `definePreview`, decorator helpers | `.` → `src/index.ts`                               |
| `StorybookConfig` / `defineMain` only         | Node condition → `src/node.ts`                     |
| Preset (`core`, `features`, `viteFinal`)      | `./preset`, `./next/preset`                        |
| Renderer hooks Storybook core loads           | `./renderer`                                       |
| Solid 2 / Solid 1 canvas addon                | `./renderer/solid-next`, `./renderer/solid-legacy` |
| Stable id `definePreview` imports             | `./renderer/preview-addon`                         |
| Docs/Controls preview annotations             | `./renderer/docs`                                  |
| Docgen worker                                 | `./internal/docgen-worker`                         |

## How `definePreview` stays version-agnostic

`src/index.ts` always builds `definePreview` from `storybook-solidjs-vite/renderer/preview-addon`. That file re-exports the Solid 2 addon by default. At Vite resolve time the [preset](./preset-and-version.md) aliases that specifier (and the inactive major’s renderer) onto the active renderer file.

`optimizeDeps.exclude` includes `storybook-solidjs-vite` so Vite does not prebundle a second Solid into the preview.

## Key modules

- `package.json` — `exports`
- `src/index.ts` — root preview entry
- `src/node.ts` — Node / `main.ts` entry
- `src/renderer/preview-addon.ts` — default re-export of `solid-next`
