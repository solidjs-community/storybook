---
"storybook-solidjs-vite": patch
---

Detect Solid 1 vs 2 from the `solid-js` package Node resolves next to `.storybook`, so Bun isolated installs and `catalog:` specifiers no longer look like a missing dependency.

Fix version detection under Bun `linker = "isolated"` ([#68](https://github.com/solidjs-community/storybook/issues/68)).
