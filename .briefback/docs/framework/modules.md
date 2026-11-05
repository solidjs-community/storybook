# Framework modules

Explanation index for what `storybook-solidjs-vite` implements under `src/`, grouped by capability — not by file.

Solid 1 and Solid 2 share one adapter. `definePreview` imports `preview-addon`; Vite aliases that (and the inactive major) onto the active renderer. Docgen and “Show code” run on the Storybook server — no Vite `__docgenInfo` inject — and read story files through Storybook's ESTree `storybook/internal/csf-tools` (no Babel). Consumers must add the Solid Vite plugin themselves (`@solidjs/vite-plugin` for Solid 2, `vite-plugin-solid` for Solid 1).

The target is Storybook 11 at parity with `@storybook/react` / `@storybook/react-vite` wherever a feature applies to Solid. The peer floor is `storybook@11.0.0-beta.0` (see [preset and version](./preset-and-version.md#storybook-version)).

| Page                                                  | Capability                                       |
| ----------------------------------------------------- | ------------------------------------------------ |
| [Package surface](./package-surface.md)               | Export map, `./node`, entries Storybook loads    |
| [Preset and version routing](./preset-and-version.md) | Peer floor, features, Solid 1 vs 2, Vite aliases |
| [Preview types and CSF](./preview-and-csf.md)         | `SolidRenderer`, CSF 3/Next, portable stories    |
| [Canvas renderer](./canvas-renderer.md)               | Mount-once canvas, stores, play, version shells  |
| [Docgen](./docgen.md)                                 | LanguageService props for Controls, Docs, MCP    |
| [Manifests and snippets](./manifests-and-snippets.md) | Manifest stub, story docs and “Show code”        |
| [React parity](./react-parity.md)                     | What matches React, deliberate differences, gaps |
| [Examples and CI](./examples-and-ci.md)               | Staged package for examples, preset check, CI    |

Playgrounds: `examples/lab` (Solid 2), `examples/solid1` (Solid 1). They install a staged copy of the package; see [examples and CI](./examples-and-ci.md).
