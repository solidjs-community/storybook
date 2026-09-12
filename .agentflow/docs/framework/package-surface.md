# Package surface

How the published package splits environments so Node config, the preset, the preview renderer, and the docgen worker do not load each other’s world.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md).

## Entries

| Capability                                                                     | Export / entry                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| CSF types, `definePreview`, decorator helpers, `StorybookConfig`, `defineMain` | `.` → `src/index.ts` (`types` → `dist/index.d.ts`)         |
| Node runtime for `main.ts` (no Solid / `definePreview`)                        | `"node"` condition on `.` → `dist/node.js` (`src/node.ts`) |
| Preset (`core`, `features`, `viteFinal`)                                       | `./preset`, `./next/preset`                                |
| Renderer hooks Storybook core loads                                           | `./renderer`                                               |
| Solid 2 / Solid 1 canvas addon                                                | `./renderer/solid-next`, `./renderer/solid-legacy`         |
| Stable id `definePreview` imports                                             | `./renderer/preview-addon`                                 |
| Docs/Controls preview annotations                                               | `./renderer/docs`                                          |
| Docgen worker (experimental server path)                                       | `./internal/docgen-worker`                                 |

`defineMain` and `StorybookConfig` come from the package root — same import as in the README and lab. The `"node"` field is a runtime condition: Node loads `dist/node.js`. TypeScript matches `"types"` first and opens `dist/index.d.ts`, which re-exports both the framework and preview public APIs.

## Published JS and types

`tsdown` (`tsdown.config.ts`, `bun --bun tsdown`) emits JS and declarations together. Source stays extensionless (`moduleResolution: "bundler"`); published `.d.ts` relative specifiers include a `.js` extension so NodeNext consumers resolve the same members. Watch skips `dts`.

`solid-js-legacy` is rewritten to `solid-js` in `dist` after emit (dev alias for Solid 1, including subpaths like `/store` and `/web`). `neverBundle` lists that alias and the root self-imports `storybook-solidjs-vite/renderer/solid-legacy` and `storybook-solidjs-vite/renderer/preview-addon`; peers and `dependencies` are already external.

`src/spec/packageExports/` typechecks a consumer file against the built `exports` map under both `nodenext` and `bundler`.

## How `definePreview` stays version-agnostic

`src/index.ts` always builds `definePreview` from `storybook-solidjs-vite/renderer/preview-addon`. That file re-exports the Solid 2 addon by default. At Vite resolve time the [preset](./preset-and-version.md) aliases that specifier (and the inactive major’s renderer) onto the active renderer file.

`optimizeDeps.exclude` includes `storybook-solidjs-vite` so Vite does not prebundle a second Solid into the preview.

## Key modules

- `package.json` — `exports`
- `tsdown.config.ts` — JS + declaration emit
- `src/index.ts` — root preview entry
- `src/node.ts` — Node / `main.ts` runtime entry
- `src/renderer/preview-addon.ts` — default re-export of `solid-next`
- `src/spec/packageExports/` — published-types consumer check
