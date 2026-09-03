# Preset and version routing

How the Node preset wires Storybook’s Vite builder, default features, Solid 1 vs 2 resolution, and Vite plugins.

See also: [modules index](./modules.md), [package surface](./package-surface.md), [docgen](./docgen.md).

## Builder and renderer

`src/framework/preset.ts` sets:

- `core.builder` → `@storybook/builder-vite`
- `core.renderer` → `storybook-solidjs-vite/renderer`

## Default features

On by default:

- `componentsManifest`
- `experimentalCodeExamples`

`experimentalDocgenServer` is **off** unless the user enables it. When off, docgen uses the Vite `__docgenInfo` inject. When on, the inject is skipped and the worker path is used instead.

## Solid major detection

`resolveSolidVersion(configDir)` (`src/internal/solidVersion.ts`) uses Storybook’s package manager against the **consumer** project (`getVersionSafe` on `solid-js`).

| Major | Renderer entry                                 |
| ----- | ---------------------------------------------- |
| 2     | `storybook-solidjs-vite/renderer/solid-next`   |
| 1     | `storybook-solidjs-vite/renderer/solid-legacy` |

## Vite `viteFinal`

1. **Renderer alias** — if Solid 2, alias `solid-legacy` (specifier + file URL) → `solid-next` so `definePreview`’s import resolves to the Solid 2 addon.
2. **Docgen plugin** — if `framework.options.docgen !== false` and `experimentalDocgenServer` is not on, push `solidComponentMetaPlugin`.
3. **Solid Vite plugin** — if the user’s Vite config has no Solid plugin yet, inject `vite-plugin-solid`.
4. **Dedupe** — always include `solid-js`, `@solidjs/web`, `@solidjs/signals`, `@solidjs/router`, `@solidjs/meta`.

## Public `main` types

`StorybookConfig` and `defineMain` live in `src/framework/public-api.ts`. `FrameworkOptions` allows Vite builder options and `docgen?: false`. The preset **does** honor `docgen: false` (skips the Vite inject).

`features.experimentalDocgenServer` is typed on `StorybookConfig` for the alternate server path.

## Key modules and tests

- `src/framework/preset.ts`
- `src/framework/public-api.ts`
- `src/internal/solidVersion.ts`
- `src/internal/componentManifest/solidComponentMetaPlugin.ts`
- `src/spec/internal/solidVersion.test.ts`
