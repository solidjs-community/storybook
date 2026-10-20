---
"storybook-solidjs-vite": patch
---

Support Storybook 11's ESTree csf-tools. Storybook 11 removes `storybook/internal/babel`, so code snippets, the component manifest and docgen now read story files through `storybook/internal/csf-tools`. Snippets keep the story's code as written instead of reprinting it, and read args and `render` with the same story-shape helpers as Storybook's React renderer: through local constants, spreads, `Story.args` assignments and story aliases. Requires a Storybook 11 prerelease that includes storybookjs/storybook#36613; on older prereleases the preset fails to load.
