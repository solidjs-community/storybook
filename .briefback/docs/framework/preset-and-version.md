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
- `docgenServer`
- `experimentalTestSyntax`

`framework.options.docgen: false` forces `docgenServer` off from this preset (Storybook then skips the docgen worker). The same opt-out is `isDocgenProviderEnabled`, which core reads when it defaults the flag.

## Solid major detection

`viteFinal` and `previewAnnotations` both call `resolveSolidVersion(configDir)` (`src/internal/solidVersion.ts`). The major is the `version` of the `solid-js` package.json that Node resolves from `.storybook`, via Storybook’s `readDependencyManifest`. That is the copy the bundler loads, whether the install is hoisted, isolated, or declared as `catalog:` / `workspace:*`. The walk goes up from `configDir`, not sideways into other workspace packages. Only majors 1 and 2 are supported.

If nothing on that walk resolves, it throws that `solid-js` is not installed.

| Major | Renderer entry                           |
| ----- | ---------------------------------------- |
| 2     | `storybook-solidjs-vite/renderer/solid2` |
| 1     | `storybook-solidjs-vite/renderer/solid1` |

Stable import ids:

- `SOLID_2_RENDERER_IMPORT` — solid2
- `SOLID_1_RENDERER_IMPORT` — solid1
- `SOLID_PREVIEW_ADDON_IMPORT` — preview-addon

## Vite `viteFinal`

Aliases:

1. `preview-addon` (specifier and resolved file URL) → active renderer file
2. The **inactive** renderer specifier and file URL → active renderer file

`resolve.dedupe` always includes `solid-js`, `@solidjs/web`, `@solidjs/signals`, `@solidjs/router`, `@solidjs/meta`.

### No `optimizeViteDeps`

React lists `react`, `react-dom/client`, `react-dom/test-utils` and `react/jsx-runtime` in `optimizeViteDeps` (#36682, #36824). Those fix two failures: the browser loading React's CJS `index.js` raw when the scan missed `react`, and a mid-run re-optimize when plugins emit `react/jsx-runtime` imports. Neither applies to Solid, so this preset does not export `optimizeViteDeps`:

- `solid-js`, `@solidjs/web` and `@solidjs/signals` (2.x) and `solid-js` 1.x are `"type": "module"`, and their `browser` → `import` exports are ESM (`dist/solid.js`, `dist/web.js`, `dist/dev.js`). A raw, unoptimized load still links.
- The user's Solid plugin already pre-bundles the runtime in `serve` (dev and Vitest). `@solidjs/vite-plugin` 3.0.0-next adds `solid-js`, `@solidjs/web` and `solid-js/refresh`. `vite-plugin-solid` 2.11 adds `solid-js`, `solid-js/web`, `solid-js/store`, `solid-js/html` and `solid-js/h`. Both add Solid packages found by `vitefu`. Compiled JSX imports `@solidjs/web` / `solid-js/web`, which is in that list.
- builder-vite's optimize-deps plugin adds every preview annotation, including our renderer entry, to `optimizeDeps.entries`. The scanner crawls it even though `storybook-solidjs-vite` itself is excluded.

Pending: a cold-cache (`node_modules/.vite` removed) lab Vitest browser run has not been done yet to confirm there is no dependency-optimization reload.

This package never injects the Solid Vite plugin (`@solidjs/vite-plugin` / `vite-plugin-solid`); the user’s Vite config owns that. There is no Vite `__docgenInfo` plugin on this branch.

## Public `main` types

`StorybookConfig` and `defineMain` live in `src/framework/public-api.ts`. `FrameworkOptions` allows Vite builder options and `docgen?: false`.

## Key modules and tests

- `src/framework/preset.ts`
- `src/framework/docgenOption.ts`
- `src/framework/public-api.ts`
- `src/internal/solidVersion.ts`
- `src/spec/framework/*`
- `src/spec/internal/solidVersion.test.ts`
