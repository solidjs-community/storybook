---
"storybook-solidjs-vite": patch
---

Rewrite the CLI example components to avoid Solid 1-only `mergeProps`/`splitProps`, so `create-storybook --type=solid` works on both Solid 1 and Solid 2. Fixes [#57](https://github.com/solidjs-community/storybook/issues/57).
