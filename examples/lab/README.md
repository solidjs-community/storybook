# Storybook SolidJS lab

Checklist for docgen, autodocs, interactions, and CSF Next tests. **Solid 2**. For Solid 1 / `solid-legacy`, see [`examples/solid1`](../solid1).

New scenarios: CSF Next (`preview.meta()` + `meta.story()`). Sidebar is grouped by **pipeline**, not by fake design-system names.

## Scripts

- `bun run storybook` — port 6006
- `bun run build-storybook` — static build + docgen snapshots
- `bun run check-docgen` — headless docgen assertions (`build-storybook` first)
- `bun run test` — Vitest browser tests

From repo root: `bun run lab`, `bun run check-docgen`, `bun run test:lab`.

## What stays and why

Each folder is a different extraction/runtime path. If two folders would catch the same bug, one of them should not exist.

| Path | Sidebar | Why it exists |
|------|---------|----------------|
| `src/scenarios/all-types` | Docgen / All types | Type matrix on one component: string, number, boolean, short enum, long enum, object, array, fn, color/date matchers, a few DOM props |
| `src/scenarios/discriminated-union` | Docgen / Discriminated union | Auto-`if` on variant-only props — not expressible as a flat matrix |
| `src/scenarios/html-attributes` | Docgen / HTML attributes | `extends JSX.HTMLAttributes` — always `class`/`style`; other inherited DOM only if set in args |
| `src/scenarios/jsx-directives` | Docgen / JSX directives | `use:` / `prop:` namespaces must not become Controls ([#56](https://github.com/solidjs-community/storybook/issues/56)) |
| `src/scenarios/utility-types` | Docgen / Utility types | `Pick` / `Omit` resolution |
| `src/scenarios/package-import` | Docgen / Package import | Component from `node_modules`, not project source |
| `src/scenarios/subcomponents` | Docgen / Subcomponents | `meta.subcomponents` |
| `src/scenarios/inline-docs` | Docs / Inline canvas | Autodocs inline vs iframe |
| `src/scenarios/interactions` | Tests / Play | CSF 3 `play()` (legacy format on purpose) |
| `src/scenarios/testing` | Tests / Story.test | CSF Next `story.test()` + `fn()` |

Dropped: **Badge** (subset of All types) and **KitchenSink** (same matrix, worse name).
