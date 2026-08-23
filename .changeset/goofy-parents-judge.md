---
"storybook-solidjs-vite": minor
---

### Docgen & autodocs

- Pin Solid component-meta to `@typescript/typescript6` so prop extraction no longer depends on the consumer's installed `typescript` version (including TypeScript 7 projects without a programmatic compiler API).
- Exclude Solid JSX-only namespaces from extracted props and Controls: `use:`, `prop:`, `attr:`, `bool:`, `on:`, and `oncapture:` (compile-time JSX syntax, not meaningful Storybook args). Fixes [#56](https://github.com/solidjs-community/storybook/issues/56).
- Fix `./renderer` package export types path (`dist/renderer/index.d.ts`).

### Build

- Split JS and declaration emit (`tsup` + `tsc`) and rewrite dev-only `solid-js-next` imports in published output.

### Compatibility

- Align Storybook integration dependencies with Storybook **10.5.x**.
- Peer range already includes Vite **8**; lab example updated to validate against it.
