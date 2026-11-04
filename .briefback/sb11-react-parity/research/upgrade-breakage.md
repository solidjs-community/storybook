# Trial upgrade: what breaks when moving off storybook@11.0.0-alpha.6

## Summary

- **Beta.0 could not be installed locally.** `bun add -d storybook@11.0.0-beta.0` failed with `No version matching "storybook" found for specifier "11.0.0-beta.0" (blocked by minimum-release-age: 259200 seconds)`. The user's `~/.bunfig.toml` sets `[install] minimumReleaseAge = 259200` (3 days). beta.0 was published 2026-11-03T18:49Z, so it clears that gate around 2026-11-06T18:49Z. I did not override this security setting.
- **Proxy: 11.0.0-alpha.8.** It is the newest prerelease past the gate (published 2026-10-23), and it is the first release without `storybook/internal/babel`. It has the same hard break as beta.0. On alpha.8:
  - `bun run typecheck` fails with 47 errors. 46 are new; 1 already exists on alpha.6.
  - `bun run test` fails before any test runs, because `globalSetup` imports Babel.
  - `bun run build` succeeds but emits `dist` that imports `storybook/internal/babel`.
  - The lab's `build-storybook` exits 0 but silently drops our renderer preset: no docgen, no manifests, no Solid previewAnnotations.
  - The lab's `check-docgen` fails.
- **Beta.0 delta, from static checks only.** From alpha.8 to beta.0 none of the APIs `src/` imports change shape. The type files change by 44 lines (see `sb11-core-changes.md`). I expect beta.0 to fail the same way as alpha.8, with no extra failures. This is inferred, not run.
- **PR #76** was updated after the handoff. The head is now `9066a74` (was `d389d19`), and its CI `test` check passes against the canary `pkg.pr.new/storybook@b26f35e1aff`, which is an ancestor of beta.0. Both review defects are **not fixed**. Every helper the PR imports exists at alpha.8, alpha.9 and beta.0.

## How it works (trial details)

### Setup (observed)

- Worktree: `git worktree add /tmp/sb-research/wt HEAD --detach` at `aad4d49`. The main tree is untouched.
- Root: `bun add -d storybook@11.0.0-alpha.8 && bun add @storybook/builder-vite@11.0.0-alpha.8` (bun 1.4.0, Node 22.16.0). Install OK. `simple-git-hooks` printed a harmless ENOTDIR (the worktree's `.git` is a file).
- Lab: `cd examples/lab && bun add -d storybook@11.0.0-alpha.8 @storybook/addon-docs@11.0.0-alpha.8 @storybook/addon-vitest@11.0.0-alpha.8`. Install OK, after building the root.
- Logs are in `/tmp/sb-research/{install-root,typecheck,test,test-probe,build,lab-build,lab-checkdocgen}.log`.

### `bun run typecheck`: exit 1, 47 errors (observed)

The baseline on alpha.6, in the main tree, has 1 error: `src/preview/reactive-story-component.ts(27,7) TS2322 Type 'unknown' is not assignable to type 'MergeArgs'`. It is pre-existing and not caused by Storybook. The other 46 errors are new:

| File:line | Error | Root cause | Fix |
| --- | --- | --- | --- |
| `src/internal/codeExamples/generateCodeSnippet.ts:1` | TS2307 `storybook/internal/babel` | Babel export removed | Port to ESTree csf-tools (PR #76) |
| `generateCodeSnippet.ts` 29 sites (31, 32, 33, 45, 70–83, 170, 202, 237, 295–319, 351, 367, 387, 401, 427, 579–639, 668) | TS7006 implicit any; TS2345 at :307 | Cascade from the missing Babel types | Same |
| `generateCodeSnippet.ts:476` / `:482` | TS2339 `_storyDeclarationPath` / `_storyPaths` not on `CsfFile` | NodePath fields removed | Use `csf.program`, story declarations, `resolveRenderFunction` |
| `generateCodeSnippet.ts:582`, `:639` | TS2339 `_file` | Babel `File` removed | `csf.program` |
| `src/internal/componentManifest/collectCsfArgNames.ts:1` | TS2307 | Babel `types` | ESTree node checks plus `staticKey` |
| `src/internal/componentManifest/getComponents.ts:3` | TS2307 | Babel `types` | ESTree plus `collectImportBindings` |
| `src/internal/componentManifest/subcomponents.ts:1`, `:13`, `:27` (+2 TS7006 at :20, :43) | TS2307; TS2339 `_ast` | `_ast` removed | `csf.program` plus `resolveIdentifierInit` |
| `src/internal/componentManifest/docgen/storyDocsProvider.ts:3` | TS2307 (`recast`) | recast removed | Snippet as text, not printed AST |
| `storyDocsProvider.ts:40` | TS2554 expected 2 args | `extractDescription(node, editor)` | Pass `csf.editor` |
| `src/internal/componentManifest/docgen/docgen-worker.ts:70` | TS2352 cast to `{ _file: { path: CsfProgram } }` | `_file` removed | Pass the `CsfFile` itself (PR #76 does) |
| `src/spec/codeExamples/generateCodeSnippet.test.ts:1` | TS2307 | Test prints with recast | Compare text snippets |
| `src/spec/componentManifest/subcomponents.test.ts:60`, `src/spec/helpers/storyScenario.ts:78` | TS2352 | Same `_file` cast | Same |

### `bun run test`: exit 1, zero tests run (observed)

Vitest reports "No test files found" and then `Error: Missing "./internal/babel" specifier in "storybook" package` from `src/internal/componentManifest/collectCsfArgNames.ts:1`. The cause is `vitest.config.ts` → `globalSetup: src/spec/helpers/vitestGlobalSetup.ts` → `tempProject.ts` → `SolidComponentMetaProject` → … → `collectCsfArgNames.ts`. That chain imports Babel, so the whole run aborts. Running the files one at a time fails the same way for all 23.

Probe: I wrote a throwaway config that clears `globalSetup` and deleted it afterwards. Result: 11 files and 41 tests pass (renderer, preview, framework, packageExports, story-store). 12 files fail on the Babel import (codeExamples, componentManifest/**, internal/solidVersion). So the renderer and preview runtime pass their unit tests on alpha.8. Only the node-side csf readers break.

### `bun run build`: exit 0, broken output (observed)

tsdown keeps `storybook/*` external, so the build succeeds. `dist/renderer.js:7`, `dist/internal/docgen-worker.js` and `dist/SolidComponentMetaManager-*.js` still `import … from "storybook/internal/babel"`. `dist/renderer.js` is the renderer preset (`core.renderer`), so the failure surfaces when Storybook loads presets.

### Lab: `bun run build-storybook`: exit 0, degraded (observed)

```
▲ Failed to load preset: {"type":"presets","name":"/private/tmp/sb-research/wt/dist/renderer.js"}
■ Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './internal/babel' is not defined by "exports" in …/node_modules/storybook/package.json imported from …/dist/renderer.js
```

Storybook logs the preset failure as a warning and keeps building. "Storybook build completed successfully" is printed. The output differs from the existing alpha.6 lab build:

- No `storybook-static/manifests/`. The alpha.6 build has `components.json` and `components.html`.
- No `storybook-static/services/core/docgen/`. The alpha.6 build has 8 files.
- `services/core/story-docs/*.json` is still written, by core without our provider (inferred).
- Our renderer `previewAnnotations` (Solid renderer entry plus `renderer/docs`) are not registered, so the preview has no Solid `renderToCanvas` and stories cannot render (inferred, not opened in a browser).

There is also a pre-existing Vite warning: `IMPORT_IS_UNDEFINED: mergeProps … no matching export in solid-js/dist/solid.js` from `dist/index.js:11`. It is the same `mergeProps` versus `merge` probe that causes the baseline TS2322. It is unrelated to Storybook.

### Lab: `bun run check-docgen`: exit 1 (observed)

`error: Cannot find module 'storybook/internal/babel' from '/private/tmp/sb-research/wt/dist/renderer.js'`

### What fix is needed

1. **Port the six source files and two specs off Babel.** This is exactly PR #76's file set. The work is done on the PR. It still has to be merged, with defects 1 and 2 below fixed first.
2. **Raise the peer floor** from `storybook: ^11.0.0-0 || ^11.0.0` to at least `^11.0.0-alpha.8`, or more simply to `^11.0.0-beta.0`, once the port lands. The current range lets alpha.8+ users install a preset that silently fails to load.
3. **Move the root and both labs** from `next`/alpha.6 (or the PR's pkg.pr.new canary) to `11.0.0-beta.0`. `examples/solid1` was not trialled.
4. **Optional:** have CI fail the lab build when "Failed to load preset" appears. Storybook exits 0 here, so a broken build passes today.

## PR #76 status (gh, 2026-11-04)

- State OPEN, draft, mergeable, base `next`. `updatedAt` 2026-10-21T15:11:40Z. The CI check `test` is SUCCESS.
- Head is `9066a74effec…` (was `d389d19` at review). Two commits were added on 2026-10-21:
  - `1ebd879` "refactor: read csf.program and csf.editor instead of their deprecated…": 4 files, small renames from `_program`/`_editor` to the public `program`/`editor`.
  - `9066a74` "chore: develop against the Storybook canary of next at b26f35e1aff": root and both labs depend on and override `storybook`, `@storybook/builder-vite`, `@storybook/addon-docs` and `@storybook/addon-vitest` as `https://pkg.pr.new/...@b26f35e1aff`, with lockfiles updated.
- Canary `b26f35e1aff` is the merge of storybookjs/storybook#36948 (`kasper/csf-core-consumers`, 2026-10-21). It is an ancestor of `v11.0.0-beta.0` but **not** of alpha.8. From that canary to beta.0, `code/core/src/csf-tools` has only 4 commits: Svelte, extend tags, test build, and `isTSWrapper`/`unwrapExpression` parameter widening. The changes are additive, so the PR should work on beta.0 (inferred).
- Helper names the PR imports, checked in `code/core/src/csf-tools/index.ts` and `story-shape/index.ts`: `createStoryArgsResolver`, `normalizeStoryDeclaration`, `resolveRenderFunction`, `staticKey`, `collectImportBindings`, `walk`, `metaObject`, `resolveIdentifierInit`, `storyShapeError`, `detachedTextOf`. All are exported at alpha.8, alpha.9 and beta.0 (observed). `csf.program` and `csf.editor` became public in `bc4cbe813b`, which is in alpha.8.
- Handoff defects, checked against the PR head file contents (via `gh api …/contents?ref=9066a74`):
  1. **Unresolved snippet values: not fixed.** `generateCodeSnippet.ts:65` is still `const { args } = resolver.resolve(storyName);`. `unresolved` and `imports` are ignored. At beta.0, core also exports `unresolvedWarning` and `noSnippetWarning` for this case.
  2. **`import X = require()` component refs: not fixed.** `getComponents.ts:138` still treats `binding.kind !== 'import'` as the local test. The import map comes only from `collectImportBindings(csf.program)` (`:78`). There is no `TSImportEqualsDeclaration` handling.
  - Follow-up 3 (computed keys in `collectCsfArgNames`) is still open: `collectCsfArgNames.ts:13` bails on `property.computed`.
  - `storyDocsProvider.ts:40` now calls `extractDescription(…, csf.editor)`, which matches the beta.0 signature.
- Before merging the PR, replace the pkg.pr.new pins and overrides with `11.0.0-beta.0` and raise the peer floor (see the fix list above).

## Relevant files

- Worktree: `/tmp/sb-research/wt`. The bumped `package.json`, `bun.lock`, `examples/lab/package.json` and `examples/lab/bun.lock` were left in place for the parent to clean up.
- Logs: `/tmp/sb-research/*.log`
- PR #76 head files fetched for inspection: `/tmp/sb-research/pr76/` (`pr76.diff`, `src/...`)

## Constraints

- The user's global `minimumReleaseAge` (3 days) blocks beta.0 until about 2026-11-06T18:49Z. Overriding it (`--minimum-release-age 0` or a project `bunfig.toml`) is the user's call.
- The project `packageManager` is `bun@1.3.14`. The trial ran on bun 1.4.0.

## Sources (accessed 2026-11-04)

- Trial commands and logs above, run 2026-11-04.
- `npm view storybook time` (publish dates).
- `gh pr view 76 --repo solidjs-community/storybook --json headRefOid,updatedAt,state,commits,statusCheckRollup`, `gh pr diff 76`, `gh api repos/solidjs-community/storybook/commits/{1ebd879,9066a74}`.
- storybookjs/storybook clone at `v11.0.0-beta.0` (`/tmp/sb-research/sb`): `git merge-base --is-ancestor`, `git diff b26f35e1aff..v11.0.0-beta.0 -- code/core/src/csf-tools`.
- `.briefback/sb11-estree-csf-tools/handoff.md`.

## Open questions

- Should we override the minimum release age for a one-off beta.0 trial, or wait until about 2026-11-06? A real beta.0 run of typecheck, test and lab build (with PR #76 applied) is the remaining gap.
- Is the PR's CI green on beta.0 itself, rather than the canary? Inferred yes, not run.
- `examples/solid1` was not trialled.

## Assumptions and limits

- Results labeled "observed" come from alpha.8, not beta.0. Beta.0 behavior is inferred from source diffs. Every node-side API we use has no diff between alpha.6 and beta.0 apart from the Babel/csf-tools change (verified on `lazy-docgen-middleware.ts`, `select-component-entry.ts`, `read-dependency-manifest.ts`, docgen/story-docs types, `docs-tools`, `test`, `csf/index.ts`).
- I did not run PR #76 locally against any release. Its compatibility rests on CI passing on the canary plus the export-name check.
- I did not open a browser on the lab build. "Stories cannot render" is inferred from the missing renderer preset.
