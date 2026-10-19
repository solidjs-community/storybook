# Package surface

How the published package splits environments so Node config, the preset, and the preview renderer do not load each other’s world.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md).

## Why the split exists

`.storybook/main.ts` must resolve framework types without pulling Solid canvas code. The preview iframe must load the renderer without Node-only docgen. Optional experimental docgen loads a worker via `./internal/docgen-worker`.

## Entries

| Capability                                                                     | Export / entry                                             |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| CSF types, `definePreview`, decorator helpers, `StorybookConfig`, `defineMain` | `.` → `src/index.ts` (`types` → `dist/index.d.ts`)         |
| Node runtime for `main.ts` (no Solid / `definePreview`)                        | `"node"` condition on `.` → `dist/node.js` (`src/node.ts`) |
| Preset (`core`, `features`, `viteFinal`)                                       | `./preset`, `./next/preset`                                |
| Renderer hooks Storybook core loads                                            | `./renderer`                                               |
| Solid 2 / Solid 1 canvas addon                                                 | `./renderer/solid-next`, `./renderer/solid-legacy`         |
| Docs/Controls preview annotations                                              | `./renderer/docs`                                          |
| Docgen worker (experimental server path)                                       | `./internal/docgen-worker`                                 |

`defineMain` and `StorybookConfig` come from the package root — same import as in the README and lab. The `"node"` field is a runtime condition: Node loads `dist/node.js`. TypeScript matches `"types"` first and opens `dist/index.d.ts`, which re-exports both the framework and preview public APIs.

## Published JS and types

`tsdown` (`tsdown.config.ts`, `bun --bun tsdown`) emits JS and declarations together. Source stays extensionless (`moduleResolution: "bundler"`); published `.d.ts` relative specifiers include a `.js` extension so NodeNext consumers resolve the same members. Watch skips `dts`.

`solid-js-next` is rewritten to `solid-js` in `dist` after emit (dev alias for Solid 2). `neverBundle` lists that alias and the root self-import `storybook-solidjs-vite/renderer/solid-legacy`; peers and `dependencies` are already external.

`src/spec/packageExports/` typechecks a consumer file against the built `exports` map under both `nodenext` and `bundler`.

## How `definePreview` stays version-agnostic

`src/index.ts` always builds `definePreview` from `storybook-solidjs-vite/renderer/solid-legacy`. When the consumer has Solid 2, [viteFinal](./preset-and-version.md) aliases that specifier (and its resolved file URL) onto `solid-next`. One public API, two runtimes.

`optimizeDeps.exclude` includes `storybook-solidjs-vite` so Vite does not prebundle a second Solid into the preview.

## Key modules

- `package.json` — `exports`
- `tsdown.config.ts` — JS + declaration emit
- `src/index.ts` — root preview entry
- `src/node.ts` — Node / `main.ts` runtime entry
- `src/spec/packageExports/` — published-types consumer check
