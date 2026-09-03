# Docgen

How Controls, Docs, and related tooling get Solid component props on the `next` line.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md), [manifests and snippets](./manifests-and-snippets.md).

## Server path (default)

`features.experimentalDocgenServer` is on by default. Storybook loads `experimental_docgenProvider` → `./internal/docgen-worker`. There is **no** Vite `__docgenInfo` inject.

Worker flow: parse CSF → resolve `meta.component` / `subcomponents` → `SolidComponentMetaManager` extract → map to argTypes → merge with downstream providers.

## Disable

```ts
framework: {
  name: 'storybook-solidjs-vite',
  options: { docgen: false },
}
```

That turns off `experimentalDocgenServer` from the framework preset so the worker is not registered.

## Extractor

`SolidComponentMetaManager` / `SolidComponentMetaProject`: TypeScript LanguageService via `@typescript/typescript6` + Volar, shaped like Storybook’s `react-component-meta`. Recycles programs under heap pressure. Filters inherited DOM noise; keeps `class` / `style` and args-referenced names. Discriminated unions become Controls `if`.

`getArgTypesData` is a one-shot extract for MCP / story-creation tooling.

## Key modules and tests

- `src/internal/componentManifest/docgen/*`
- `src/internal/componentManifest/solidComponentMeta/*`
- `src/internal/componentManifest/toDocgenInfo.ts`
- `src/framework/docgenOption.ts`
- `src/spec/componentManifest/**`
- `src/spec/framework/*`
