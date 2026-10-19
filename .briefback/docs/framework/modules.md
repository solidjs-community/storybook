# Framework modules

Explanation index for what `storybook-solidjs-vite` implements under `src/`, grouped by capability — not by file.

Solid 1 and Solid 2 share one adapter. `definePreview` imports the legacy renderer entry; Vite aliases that entry to `solid-next` when the consumer runs Solid 2. Default docgen injects `__docgenInfo` in Vite; the experimental docgen server is an alternate path.

| Page                                                  | Capability                                            |
| ----------------------------------------------------- | ----------------------------------------------------- |
| [Package surface](./package-surface.md)               | Export map and entry points Storybook loads           |
| [Preset and version routing](./preset-and-version.md) | Builder, features, Solid 1 vs 2, Vite plugins/aliases |
| [Preview types and CSF](./preview-and-csf.md)         | `SolidRenderer`, CSF 3/Next, decorator helpers        |
| [Canvas renderer](./canvas-renderer.md)               | Mount-once canvas, stores, play, version shells       |
| [Docgen](./docgen.md)                                 | Vite inject and optional docgen-server worker         |
| [Manifests and snippets](./manifests-and-snippets.md) | Components manifest and Autodocs “Show code”          |

Playgrounds: `examples/lab` (Solid 2), `examples/solid1` (Solid 1).
