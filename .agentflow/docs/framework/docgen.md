# Docgen

How Controls, Docs, and related tooling get Solid component props.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md), [manifests and snippets](./manifests-and-snippets.md).

## Two paths

| Mode                      | When                                                  | How props reach the preview                                                                |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Vite inject (default)** | `docgen` not false and `experimentalDocgenServer` off | `solidComponentMetaPlugin` appends `Component.__docgenInfo = …` to component modules       |
| **Docgen server**         | `features.experimentalDocgenServer: true`             | Storybook loads `experimental_docgenProvider` → `./internal/docgen-worker`; no Vite inject |

`framework.options.docgen: false` disables the Vite inject. Preview `src/renderer/docs.ts` still knows how to read `__docgenInfo` for Controls when the inject path is used (`extractArgTypes`).

## Extractor

Both paths use `SolidComponentMetaManager` / `SolidComponentMetaProject`: TypeScript LanguageService via `@typescript/typescript6` + Volar, shaped like Storybook’s `react-component-meta`.

Typical behavior:

- Resolve `meta.component` (and `subcomponents`) from CSF to a source file
- Serialize prop types (unions, arrays, objects, discriminated unions → Controls `if`)
- Filter inherited DOM/HTML/SVG noise; keep `class` / `style` and args-referenced names
- Recycle programs under heap pressure to avoid OOM

`getArgTypesData` is a one-shot extract for MCP / story-creation tooling.

## Disable

```ts
framework: {
  name: 'storybook-solidjs-vite',
  options: { docgen: false },
}
```

## Key modules and tests

- `src/internal/componentManifest/solidComponentMetaPlugin.ts`
- `src/internal/componentManifest/docgen/*`
- `src/internal/componentManifest/solidComponentMeta/*`
- `src/internal/componentManifest/toDocgenInfo.ts`
- `src/renderer/docs.ts`
- `src/spec/componentManifest/**`
