---
"storybook-solidjs-vite": patch
---

Match two small React behaviors:

- `.test()` stories (`test-fn` tag) now throw React's error when `features.experimentalTestSyntax` is `false`. The flag stays on by default.
- The `create-storybook` templates document every `Button` and `Header` prop: JSDoc `@param` types in JS and doc comments in TS. Server docgen now shows prop types and descriptions in JS projects. The JS `Page` template now imports `Header`.
