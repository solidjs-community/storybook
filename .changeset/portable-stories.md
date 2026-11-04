---
"storybook-solidjs-vite": minor
---

### Portable stories and a `./node` entry

- `setProjectAnnotations`, `composeStory`, `composeStories` and `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` are exported from the package root, like `@storybook/react`. They use the Solid renderer annotations, so plain Vitest, Jest or Playwright CT can render Solid stories. `composeStories` also takes CSF Next modules that have no `export default`. With `@storybook/addon-vitest` you do not need them.
- New `storybook-solidjs-vite/node` subpath for `.storybook/main.ts` (`defineMain`, `StorybookConfig`). `storybook automigrate csf-factories` writes this import, which did not resolve before.
