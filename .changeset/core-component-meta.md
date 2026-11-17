---
"storybook-solidjs-vite": patch
---

The docgen server's TypeScript program manager now builds on Storybook's `storybook/internal/component-meta`, like `@storybook/react`. Tsconfig lookup is unchanged. Two visible differences:

- The heap-pressure warning uses Storybook's wording and shows once per process.
- A file with no `tsconfig.json` or `jsconfig.json` above it now gets the intended default compiler options (`strict`, `allowJs`, `jsx: preserve`). Before, they were ignored.
