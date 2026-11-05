---
"storybook-solidjs-vite": minor
---

### Portable stories and a `./node` entry

- `setProjectAnnotations`, `composeStory`, `composeStories` and `INTERNAL_DEFAULT_PROJECT_ANNOTATIONS` are exported from the package root, like `@storybook/react`. They use the Solid renderer annotations, so plain Vitest, Jest or Playwright CT can render Solid stories. `composeStories` also takes CSF Next modules that have no `export default`. With `@storybook/addon-vitest` you do not need them. The root entry now has a `browser` condition ahead of `node`, so Vitest in a DOM environment loads the preview API instead of the Node entry. Solid 1 projects alias `storybook-solidjs-vite/renderer/preview-addon` to `storybook-solidjs-vite/renderer/solid1` in their Vitest config (see README).
- New `storybook-solidjs-vite/node` subpath for `.storybook/main.ts` (`defineMain`, `StorybookConfig`). `storybook automigrate csf-factories` writes this import, which did not resolve before.
