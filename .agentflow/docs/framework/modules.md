# Framework modules

Explanation index for what `storybook-solidjs-vite` implements under `src/`, grouped by capability — not by file.

Solid 1 and Solid 2 share one adapter. `definePreview` imports `preview-addon`; Vite aliases that (and the inactive major) onto the active renderer. Docgen and “Show code” run on the Storybook server — no Vite `__docgenInfo` inject. Consumers must add `vite-plugin-solid` themselves.

| Page                                                  | Capability                                        |
| ----------------------------------------------------- | ------------------------------------------------- |
| [Package surface](./package-surface.md)               | Export map and entry points Storybook loads       |
| [Preset and version routing](./preset-and-version.md) | Builder, features, Solid 1 vs 2, Vite aliases     |
| [Preview types and CSF](./preview-and-csf.md)         | `SolidRenderer`, CSF 3/Next, decorator helpers    |
| [Canvas renderer](./canvas-renderer.md)               | Mount-once canvas, stores, play, version shells   |
| [Docgen](./docgen.md)                                 | LanguageService props for Controls, Docs, MCP     |
| [Manifests and snippets](./manifests-and-snippets.md) | Components manifest stub and Autodocs “Show code” |

Playgrounds: `examples/lab` (Solid 2), `examples/solid1` (Solid 1). `bun run check-docgen` exercises the docgen worker against a lab static build.
