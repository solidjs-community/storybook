---
"storybook-solidjs-vite": minor
---

### Solid 2 support

Solid 2 projects should import types and APIs from `storybook-solidjs-vite/next` in stories, preview, and other app code for correct Solid 2 typings:

```ts
import type { Preview, Meta, StoryObj } from 'storybook-solidjs-vite/next';
```

You can still import from `storybook-solidjs-vite` without `/next` on Solid 2, but that may produce TypeScript errors because those types target the Solid 1 renderer.

In `.storybook/main.ts`, both framework names are valid:

- `storybook-solidjs-vite` — auto-detects Solid version from installed `solid-js` (works for Solid 2 projects)
- `storybook-solidjs-vite/next` — pins the Solid 2 renderer explicitly

```ts
// Either is fine for a Solid 2 app
framework: 'storybook-solidjs-vite'
framework: 'storybook-solidjs-vite/next'
```

Solid 1 projects keep using `storybook-solidjs-vite` for imports and framework config.

### CSF Next (optional)

`definePreview`, `preview.meta`, and `meta.story` are also available on both Solid 1 and Solid 2. CSF 3 (`Meta`, `StoryObj`, default export meta) continues to work; migrate to CSF Next when you want factory-based typing, not as a requirement for Solid 2.

```ts
// .storybook/main.ts
import { defineMain } from 'storybook-solidjs-vite/node';

export default defineMain({
  framework: { name: 'storybook-solidjs-vite/next' },
});
```

```ts
// .storybook/preview.tsx
import { definePreview } from 'storybook-solidjs-vite/next';
```

### Removals

- **Removed `setProjectAnnotations`** — it only mattered for portable stories, which this integration does not support. If you adopt CSF Next, use `definePreview` in `.storybook/preview` and import that preview in story files.

### Internal

Large refactor of renderer internals: shared preview pipeline, separate Solid 1 / Solid 2 renderers, and streamlined docgen integration.
