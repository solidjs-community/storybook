---
"storybook-solidjs-vite": patch
---

Build JS and declarations with `tsdown` instead of `tsup` + `tsc` emit, so published `.d.ts` files use NodeNext-legal relative specifiers.

Fix public types under `moduleResolution: "nodenext"` ([#67](https://github.com/solidjs-community/storybook/issues/67)).
