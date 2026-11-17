# Storybook 11 beta.3 parity

> Keep this plan current during implementation.
> Check off tasks as their outcomes are completed.
> Check a stage only after done-when, verification, review, and commit
> (or staging per project rules).
> Record scope changes before leaving the stage.
> Record landed commits under the stage they implement.

**Goal:** bring `storybook-solidjs-vite` to React parity at Storybook `11.0.0-beta.3` and call the factory format CSF 4.
**Approach:** bump Storybook, then close the gaps from [parity delta](./research/parity-delta.md): docgen engine fixes (G3, G4, G5, G7), live snippets (G1), the Solid 2 / Vitest 5 dev setup, and the CSF 4 rename with doc updates (G6). The upstream `create-storybook` work (G2) is a separate plan: [upstream-storybook.md](./upstream-storybook.md).

**Decisions**

- Live snippets import core's helpers; the `storybook` peer becomes `^11.0.0-beta.3 || ^11.0.0`.
- Manifests report `docgen: 'solid-component-meta'` (cast against core's closed union); the `reactComponentMeta` payload field stays because it feeds MCP props.
- Docgen payloads set `renderer: 'solid'`; no `apiDescription`.
- Root and lab dev setups move to Solid `^2.0.0`, `@solidjs/vite-plugin` `^3.0.0` and Vitest 5.
- Keep `^` ranges when bumping (user `.npmrc` has `save-exact=true`).
- Rename prose and internal identifiers to "CSF 4"; keep `csf-factories` / `csf-next-mocked-args` ids, `csf-factories.test.ts`, the `./next` export and `CHANGELOG.md`.
- `template/cli` stays CSF 4 (earlier decision). Do not promote 11.x to npm `latest` before upstream PR 1 ships.

**Reuse:** `storybook/internal/docs-tools` (`createHoleMarks`, `stripHoles`, `withHoleSpace`, `printValue`, `SnippetTemplate`), `getOrCreateSolidComponentMetaManager` (`src/internal/componentManifest/solidComponentMeta/SolidComponentMetaManager.ts`), React's `snippet-values.ts` / `docs/print-hole.ts` / `generateCodeSnippet.ts` at `/tmp/sb-research/sb` tag `v11.0.0-beta.3`.

## Out of scope

- `apiDescription` on docgen payloads.
- Upstream Storybook PRs (tracked in [upstream-storybook.md](./upstream-storybook.md)).
- npm dist-tag changes.

## Stage 1 — Storybook beta.3

**Depends on:** None.

**This stage:** move the root and both examples to `storybook` `^11.0.0-beta.3`. builder-vite beta.3 no longer brings `ts-dedent`, which two specs import, so declare it. The trial run showed no `src/` change is needed.

- [ ] Complete
  - [ ] Root `storybook`, `@storybook/builder-vite` at `^11.0.0-beta.3`; `ts-dedent` devDependency
  - [ ] `examples/lab` and `examples/solid1` Storybook packages at `^11.0.0-beta.3`, lockfiles updated
  - [ ] Changeset

**Files**

- `package.json`, `bun.lock`, `examples/{lab,solid1}/{package.json,bun.lock}`
- `.changeset/sb11-beta3.md` — create

**Done when:** root tests, lab `check-docgen` + Vitest and the solid1 build pass on beta.3.
**Verify:** `bun run typecheck && bun run test && bun run build && bun run stage && bun run check-docgen`, lab `bun run test`, solid1 `bun run build-storybook`
**Commits:** None yet.

## Stage 2 — Docgen engine fixes

**Depends on:** Stage 1.

**This stage:** `internal_getArgTypesData` reuses one warm process-wide manager like React (#37141) instead of building a TypeScript program per call. `experimental_manifests` returns the existing manifests when `docgenServer` is off, like Vue/Svelte/WC. The manifest reports our own engine id and payloads carry `renderer: 'solid'`.

- [ ] Complete
  - [ ] `getArgTypesData` uses `getOrCreateSolidComponentMetaManager`
  - [ ] `generateComponentManifests` passes `existingManifests` through when `docgenServer` is off
  - [ ] `docgen: 'solid-component-meta'`
  - [ ] `renderer: 'solid'` on docgen payloads
  - [ ] Tests and a changeset

**Files**

- `src/internal/componentManifest/manifests.ts` — `getArgTypesData`, `generateComponentManifests`
- `src/internal/componentManifest/solidComponentMeta/SolidComponentMetaManager.ts` — engine id comment / constant
- `src/internal/componentManifest/docgen/docgen-worker.ts` — `docPayload`
- `src/spec/componentManifest/manifests.test.ts`

**Done when:** manifests report `solid-component-meta`, payloads have `renderer: 'solid'`, and docgen off yields no engine.
**Verify:** `bun run typecheck && bun run test && bun run build && bun run stage && bun run check-docgen`
**Commits:** None yet.

## Stage 3 — Live snippets

**Depends on:** Stage 1.

**This stage:** port React's live snippets (#37170). `getCodeSnippet` also returns a `SnippetTemplate` with Solid hole places; the story-docs provider adds it to each `StoryDoc` when code examples are on; the preview sets `parameters.docs.source.printHole` under `docgenServer`. Raise the peer to `^11.0.0-beta.3 || ^11.0.0`.

- [ ] Complete
  - [ ] Shared Solid snippet value printers (attribute, attributes, children)
  - [ ] `getCodeSnippet` returns `template`; `stripHoles(template) === snippet`
  - [ ] Story docs carry `template` when code examples are on
  - [ ] Preview `printHole` under `docgenServer`
  - [ ] Peer floor raised; lab enables `experimentalLiveServerSnippets`
  - [ ] Ported template tests and a changeset

**Files**

- `src/internal/codeExamples/generateCodeSnippet.ts` — `getCodeSnippet`
- `src/internal/codeExamples/snippet-values.ts` — create: printers shared by the server generator and the preview `printHole`; no existing module serves both
- `src/renderer/print-hole.ts` — create: preview-side hole printer (React `docs/print-hole.ts`)
- `src/internal/componentManifest/docgen/storyDocsProvider.ts` — `buildStoryDocs`
- `src/renderer/docs.ts` — `parameters.docs.source.printHole`
- `src/spec/codeExamples/generateCodeSnippet.test.ts`
- `package.json` — peer
- `examples/lab/.storybook/main.ts`

**Done when:** in the lab, changing a control updates Show code without the "does not follow" warning.
**Verify:** `bun run typecheck && bun run test && bun run build && bun run stage && bun run check-docgen`, lab `bun run test`
**Commits:** None yet.

## Stage 4 — Solid 2 stable and Vitest 5

**Depends on:** Stage 1.

**This stage:** match what `create-storybook` gives new users: Solid 2.0.0, `@solidjs/vite-plugin` 3.0.0, Vitest 5.

- [ ] Complete
  - [ ] Root devDependencies: `solid-js`, `@solidjs/web` `^2.0.0`, Vitest 5, `@vitest/coverage-v8` 5
  - [ ] Lab: Solid `^2.0.0`, `@solidjs/vite-plugin` `^3.0.0`, Vitest 5 packages

**Files**

- `package.json`, `bun.lock`, `examples/lab/{package.json,bun.lock}`

**Done when:** root tests and lab tests pass on the new versions.
**Verify:** `bun run typecheck && bun run test`, lab `bun run test`, `bun run check-docgen`
**Commits:** None yet.

## Stage 5 — CSF 4 naming and docs

**Depends on:** Stages 2–4 (docs describe their results).

**This stage:** finish the rename from the [naming inventory](./research/naming-csf4.md), fix `MIGRATION.md`'s claim that `create-storybook` scaffolds CSF 4 for Solid today, and refresh the framework docs to beta.3.

- [ ] Complete
  - [ ] Inventory sites renamed (prose, internal identifiers, fixture `Button.csf4.stories.ts`)
  - [ ] `MIGRATION.md` scaffold claim corrected
  - [ ] `react-parity.md` and other framework docs at beta.3
  - [ ] User's README "Feature parity" edit included

**Files**

- `MIGRATION.md`, `AGENTS.md`, `README.md`, `.changeset/*`, `examples/lab/README.md`
- `src/framework/{preset,public-api}.ts`, `src/preview/portable-stories.ts`, `src/spec/**`
- `.briefback/docs/framework/*`

**Done when:** `grep -ri 'csf.\?next'` hits only kept ids, the `./next` export and `CHANGELOG.md`.
**Verify:** `bun run typecheck && bun run test`
**Commits:** None yet.
