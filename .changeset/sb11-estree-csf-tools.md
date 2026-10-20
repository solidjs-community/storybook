---
"storybook-solidjs-vite": patch
---

Read story files through Storybook 11's public csf-tools API. Storybook 11 removes `storybook/internal/babel` and exposes ESTree nodes from `CsfFile`, so code snippets, the component manifest and docgen now use `csf._program`, `walk`, `textOf` and the story-shape helpers. Snippets keep the story's code as written instead of reprinting it with recast.
