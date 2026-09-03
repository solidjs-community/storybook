# Preset and version routing

How the Node preset wires Storybook’s Vite builder, default features, and Solid 1 vs 2 resolution.

See also: [modules index](./modules.md), [package surface](./package-surface.md), [docgen](./docgen.md).

## Builder and renderer

`src/framework/preset.ts` sets:

- `core.builder` → `@storybook/builder-vite`
- `core.renderer` → `storybook-solidjs-vite/renderer`

## Default features

On by default:

- `componentsManifest`
- `experimentalCodeExamples`
- `experimentalDocgenServer`
- `experimentalTestSyntax`

`framework.options.docgen: false` forces `experimentalDocgenServer` off from this preset (Storybook then skips the docgen worker).

## Solid major detection

`resolveSolidVersion(configDir)` (`src/internal/solidVersion.ts`) uses Storybook’s package manager against the **consumer** project. Only majors 1 and 2 are supported.

| Major | Renderer entry                                 |
| ----- | ---------------------------------------------- |
| 2     | `storybook-solidjs-vite/renderer/solid-next`   |
| 1     | `storybook-solidjs-vite/renderer/solid-legacy` |

Stable import ids:

- `SOLID_DEFAULT_RENDERER_IMPORT` — solid-next
- `SOLID_LEGACY_RENDERER_IMPORT` — solid-legacy
- `SOLID_PREVIEW_ADDON_IMPORT` — preview-addon

## Vite `viteFinal`

Aliases:

1. `preview-addon` (specifier and resolved file URL) → active renderer file
2. The **inactive** renderer specifier and file URL → active renderer file

`resolve.dedupe` always includes `solid-js`, `@solidjs/web`, `@solidjs/signals`, `@solidjs/router`, `@solidjs/meta`.

This package never injects `vite-plugin-solid`; the user’s Vite config owns that. There is no Vite `__docgenInfo` plugin on this branch.

## Public `main` types

`StorybookConfig` and `defineMain` live in `src/framework/public-api.ts`. `FrameworkOptions` allows Vite builder options and `docgen?: false`.

## Key modules and tests

- `src/framework/preset.ts`
- `src/framework/docgenOption.ts`
- `src/framework/public-api.ts`
- `src/internal/solidVersion.ts`
- `src/spec/framework/*`
- `src/spec/internal/solidVersion.test.ts`
