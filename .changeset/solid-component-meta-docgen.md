---
"storybook-solidjs-vite": minor
---

Replace react-docgen-typescript with solid-component-meta for Controls, Docs, and the components manifest.

- Add `componentManifest/` pipeline: TypeScript LanguageService extraction, Vite `__docgenInfo` injection, and manifest hooks (`experimental_manifests`, `internal_getArgTypesData`)
- Enable components manifest debugger by default (`features.componentsManifest`); opt out of docgen via `framework.options.docgen: false`
- Trim runtime docs layer to RCM-only (`entry-preview-argtypes` reads injected `__docgenInfo`); remove legacy acorn/propTypes docgen (~1500 lines)
- Make `framework.options` optional in `StorybookConfig`
- Add `bun run typecheck`; exclude CLI `template/` from TypeScript project (scaffold files, not built)
- Update README and MIGRATION for RCM, manifest debugger, and Storybook MCP
