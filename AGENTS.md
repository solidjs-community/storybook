# storybook-solidjs-vite

Storybook framework adapter for SolidJS on Vite. Supports Solid 1 and Solid 2.

Larger than a quick fix: follow @AGENTFLOW.md ([AgentFlow](https://github.com/reforma-dev/agentflow)).

Do not edit `AGENTFLOW.md`. Refresh it with `npx @reforma/agentflow@latest update`.

## Layout

- `src/framework/` — Storybook preset / public config API
- `src/renderer/` — canvas render, decorators, Solid 1 vs Solid 2
- `src/preview/` — `definePreview` / CSF Next preview
- `src/internal/` — docgen, component manifest, code snippets
- `src/spec/` — Vitest tests
- `examples/lab` — Solid 2 playground and integration checks
- `examples/solid1` — Solid 1 playground
- `template/` — files copied by `create-storybook --type=solid`

Published package: `storybook-solidjs-vite`. Consume via `bun` (`packageManager` in `package.json`).

## Commands

```bash
bun install
bun run typecheck
bun run test
bun run lint
bun run build
bun run lab # build JS, then Storybook in examples/lab
bun run check-docgen # lab static build + docgen check
```

Verify with the smallest command that covers the change. Renderer/docgen work usually needs `bun run test`; preset or lab-only work may also need `bun run lab` or `bun run check-docgen`.

## Conventions

- Match nearby code. Do not add a new abstraction when an existing one fits.
- JSX decorators for stories must use `createJSXDecorator` so they do not remount on args/globals updates. Side-effect-only decorators use `createDecorator`.
- Docgen runs on the Storybook server (`features.experimentalDocgenServer`, on by default). There is no Vite `__docgenInfo` inject.
- `framework.options.docgen: false` turns off `experimentalDocgenServer` from this preset.
- User Vite config must include `vite-plugin-solid`. This package does not inject it.
- Commits: conventional (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `perf`, `revert`) via commitlint.
- User-facing changes: add a changeset (`bun run changelog`).
- Do not commit `dist/`. `prepack` builds it.
