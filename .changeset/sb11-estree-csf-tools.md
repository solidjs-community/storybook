---
"storybook-solidjs-vite": patch
---

Read story files through Storybook 11's ESTree csf-tools (`storybook/internal/csf-tools`). Storybook 11 removes `storybook/internal/babel` and exposes ESTree nodes from `CsfFile`, so code snippets, the component manifest and docgen now use `csf._program`, `walk`, `textOf` and the story-shape helpers. Snippets keep the story's code as written instead of reprinting it with recast. Requires the first Storybook 11 prerelease that includes storybookjs/storybook#36613; on older Storybook 11 prereleases the preset fails to load.
