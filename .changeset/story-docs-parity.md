---
"storybook-solidjs-vite": minor
---

Story docs match `@storybook/react`'s payload:

- `import` lists the components and imported arg values the snippets use, so **Show code** prepends a working import block.
- A component in a publishable package is imported by its package name; app-private packages keep the story's import.
- Story JSDoc `@summary` is served as `summary`.
- Args read from other files, such as `...Base.args` of an imported story, resolve in snippets instead of being reported as unresolved.
- `features.experimentalCodeExamples: false` now turns snippets off; story descriptions are still served.
