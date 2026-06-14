---
"storybook-solidjs-vite": minor
---

Enable static Autodocs code snippets by default via Storybook's experimental code examples pipeline.

- Add `generateCodeSnippet` AST helper and `experimental_enrichCsf` preset hook
- Enable `features.experimentalCodeExamples` by default; opt out in `.storybook/main.ts`
- Include per-story `snippet` fields in the components manifest
