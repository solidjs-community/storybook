---
"storybook-solidjs-vite": patch
---

Docgen fixes to match Storybook 11's other frameworks:

- The components manifest reports its engine as `solid-component-meta` instead of `react-component-meta`, and docgen payloads carry `renderer: 'solid'`.
- With `framework.options.docgen: false`, the manifest no longer reports a docgen engine.
- Ghost stories (addon-vitest) reuse one TypeScript program instead of building a new one for every component.
