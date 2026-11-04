---
"storybook-solidjs-vite": minor
---

Bring the server docgen payload in line with `@storybook/react`:

- `description` now merges the meta docblock with the component's JSDoc (the meta wins, like React), and the payload carries `summary` from `@summary`. Subcomponents get `summary` too.
- A story file whose meta has no `component` returns an `error` named `No component found`. A component whose file cannot be read returns `No component import found`. Both include a code frame at the meta and the story source. A declared subcomponent with no import returns its own `No component import found` error. Before, these returned nothing.
- The component id comes from Storybook's `getComponentIdFromEntry`.
- Fix `internal_getArgTypesData` for absolute component paths, which `@storybook/addon-vitest` passes. Component tests no longer get `null` argTypes. Relative paths now resolve against the Storybook project root instead of `process.cwd()`.
