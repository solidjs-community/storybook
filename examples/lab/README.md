# Storybook SolidJS lab

Manual and automated checks for docgen, interactions, CSF Next `.test()`, Autodocs, and legacy CSF 3. Runs on **Solid 2**. For Solid 1 / `solid-legacy`, see [`examples/lab-solid1`](../lab-solid1).

**Default for new scenarios:** CSF Next (`preview.meta()` + `meta.story()`).

## Scripts

- `bun run storybook` — dev server on port 6006
- `bun run build-storybook` — static build + manifests
- `bun run check-docgen` — headless docgen assertions (requires `build-storybook` first)
- `bun run test` — Vitest browser tests via `@storybook/addon-vitest`

From repo root:

- `bun run lab` — Storybook dev server (port 6006)
- `bun run check-docgen`
- `bun run test:lab`

## Scenarios

| Path | Format | Purpose |
|------|--------|---------|
| `src/scenarios/badge` | CSF 3 | Enum unions, autodocs (legacy) |
| `src/scenarios/discriminated-union` | CSF Next | Discriminated union docgen |
| `src/scenarios/html-attributes` | CSF Next | HTMLAttributes filter |
| `src/scenarios/package-import` | CSF Next | Package component import |
| `src/scenarios/subcomponents` | CSF Next | `meta.subcomponents` |
| `src/scenarios/utility-types` | CSF Next | `Pick` / utility types |
| `src/scenarios/interactions` | CSF 3 | `play` functions (legacy) |
| `src/scenarios/testing` | CSF Next | `meta.story().test()` + `fn()` mocks |

## Inline stories (Autodocs) verification

`storybook-solidjs-vite` sets `parameters.docs.story.inline: true` (see `src/renderer/docs.ts`).

1. Run `bun run storybook` and open **Docgen Lab / Badge** docs.
2. Confirm the story canvas is rendered inline (no nested preview iframe around the story block).
3. Change **variant** or **label** in Controls on the docs page — the inline canvas updates.

Verified: inline Autodocs + reactive Controls work with the Badge scenario.
