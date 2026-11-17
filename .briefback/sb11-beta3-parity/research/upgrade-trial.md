# Upgrade trial: Storybook 11.0.0-beta.0 → 11.0.0-beta.3

## Summary

In an isolated worktree, everything passes on beta.3 after **one fix: add `ts-dedent` to root devDependencies**: root typecheck, unit tests, build, stage, the lab static build, `check-docgen`, lab Vitest browser tests, the Solid 1 static build, and the headless `storybook tools` commands. No `src/` change was needed. The already published `storybook-solidjs-vite@next` (`11.0.0-next-20261105190313`, built against beta.0) also builds and passes story tests in a fresh `create-storybook@11.0.0-beta.3` Solid project.

## Setup

- Worktree: `/tmp/sb-research/wt`, detached at `3a31250`. It was created fresh after `git worktree prune` and a stale dir was removed. **Left in place**, with uncommitted bumps to `package.json`, `bun.lock`, `examples/{lab,solid1}/{package.json,bun.lock}`.
- Tools: bun 1.4.4, Node 22.16.0, macOS. Logs are in `/tmp/sb-research/logs/NN-*.log`.

## Commands and results

| #   | Where       | Command                                                                                                          | Result                                                                                                                                                       |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 01  | root        | `bun install --minimum-release-age=0`                                                                            | ok (beta.0)                                                                                                                                                  |
| 02  | root        | `bun add -d --minimum-release-age=0 storybook@^11.0.0-beta.3`                                                    | ok. Wrote **exact** `"11.0.0-beta.3"` (user `.npmrc` has `save-exact=true`); hand-edited back to `^11.0.0-beta.3`. `simple-git-hooks` errors in a worktree (harmless) |
| 03  | root        | `bun add --minimum-release-age=0 @storybook/builder-vite@^11.0.0-beta.3`                                          | ok (same exact-version note)                                                                                                                                 |
| 04  | root        | `bun run typecheck`                                                                                              | **fail**: `TS2307 Cannot find module 'ts-dedent'` in `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/componentManifest/storyDocsProvider.test.ts` |
| 05  | root        | `bun run test`                                                                                                   | **fail**: same 2 files cannot import `ts-dedent`; 28 files / 243 tests pass                                                                                  |
| 06  | root        | `bun run build`                                                                                                  | ok                                                                                                                                                           |
| 07  | root        | `bun run stage`                                                                                                  | ok                                                                                                                                                           |
| fix | root        | `bun add -d --minimum-release-age=0 ts-dedent@^2.2.0`                                                            | ok                                                                                                                                                           |
| 04b | root        | `bun run typecheck`                                                                                              | **pass**                                                                                                                                                     |
| 05b | root        | `bun run test`                                                                                                   | **pass**: 30 files / 280 tests                                                                                                                               |
| —   | root        | `bun run build && bun run stage` (re-stage with `^` ranges)                                                      | ok                                                                                                                                                           |
| 10  | lab         | bump `storybook`, `@storybook/addon-docs`, `@storybook/addon-vitest` to `^11.0.0-beta.3`; `bun install --minimum-release-age=0` | ok; installed storybook / addon-docs / addon-vitest / builder-vite 11.0.0-beta.3, staged package from `.pack`                                                 |
| 11  | lab         | `bun run build-storybook` (preset-load guard script)                                                             | **pass** (only Vite chunk-size warnings)                                                                                                                     |
| 12  | root        | `bun run check-docgen`                                                                                           | **pass**: all scenarios OK (e.g. `PickedButton (Pick utility)`, `Package Button (@design-system/button)`)                                                     |
| 13  | lab         | `bun run test`                                                                                                   | **fail (environment)**: `browserType.launch: Executable doesn't exist … chromium_headless_shell-1234`; no Playwright browsers were cached on this machine      |
| 14  | lab         | `bunx playwright install chromium`                                                                               | ok (downloads to `~/Library/Caches/ms-playwright`; CI does the same step)                                                                                     |
| 15  | lab         | `bun run test`                                                                                                   | **pass**: 10 files / 12 tests. One console warning `[STRICT_READ_UNTRACKED] … in <Counter>` (Solid 2 dev warning from a lab story; not compared with beta.0)  |
| 20  | solid1      | bump `storybook`, `@storybook/addon-docs` to `^11.0.0-beta.3`; `bun install --minimum-release-age=0`              | ok                                                                                                                                                           |
| 21  | solid1      | `bun run build-storybook`                                                                                        | **pass**                                                                                                                                                     |

### Root cause of the only failure

`ts-dedent` was never declared by this repo. It reached `node_modules` as a dependency of `@storybook/builder-vite@11.0.0-beta.0` (lockfile: `"@storybook/builder-vite@11.0.0-beta.0" … { "dependencies": { "ts-dedent": "^2.2.0" } }`). builder-vite beta.3 has no dependencies, so the package disappears. Fix: add `ts-dedent` to root `devDependencies`.

## Headless agent CLI in `examples/lab` (beta.3, no dev server running)

| #   | Command                                                                                     | Result                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30  | `bunx storybook tools --help`                                                               | ok (0.6 s). Lists `stories preview` [requires running Storybook], `stories changed` [local], `stories find-by-component` [local], `review create` [requires running Storybook], `docs list` [local], `docs show` [local], `docs show-story` [local], `test run` [local] |
| 31  | `bunx storybook tools docs list`                                                            | ok (~2.4 s). `# Components` with 10 entries, e.g. `- Callout (docgen-all-types): Flagship docgen target…`, `- Card (docgen-subcomponents): …`, `- Counter (tests-play)` |
| 32  | `bunx storybook tools docs show --id docgen-all-types`                                      | ok. JSDoc description, `## Props` type block with all 19 props and their JSDoc, `## Stories` with `Default` snippet and import. Quirk: `aria-label?: string;` printed unquoted (core formatter) |
| 33  | `bunx storybook tools docs show --id docgen-subcomponents`                                  | ok. `## Subcomponents` `Header` / `Footer` with their own props                                                                                               |
| 34  | `bunx storybook tools docs show-story --storyId tests-play--default`                        | ok. `const Default = () => <Counter label="Clicks" initial={0} />;`                                                                                            |
| 35  | `bunx storybook tools stories find-by-component --componentPaths <abs path>`                | exit 1: `Invalid type: Expected Array but received "…"` (a single flag value is not an array)                                                                   |
| 35b | same with `--input '{"componentPaths":["<abs>/src/scenarios/all-types/Callout.tsx"]}'`      | ok. `docgen-all-types--default` at distance 1                                                                                                                 |
| 36  | `bunx storybook tools test run --input '{"stories":[{"storyId":"tests-play--default"}]}'`   | ok (~4 s). "Passed: 1 component test passed. Accessibility: not checked (addon-a11y is not enabled)."                                                          |
| 37  | `bunx storybook skills write-stories` / `component-docs`                                    | ok. Solid-correct output ("This project writes stories with CSF Factories, because `.storybook/preview.tsx` uses `definePreview`…")                            |
| —   | `bunx storybook skills setup`                                                               | refused: "AI-assisted setup is currently only available for React, Angular, and Vue projects using the Vite builder. Detected renderer: storybook-solidjs-vite, builder: @storybook/builder-vite." |

## Fresh scaffold with `create-storybook@11.0.0-beta.3`

Directory: `/tmp/sb-research/scaffold`, a minimal Solid 2 + Vite 8 project, npm.

| #   | Command                                                                                                       | Result                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 41  | `npx -y create-storybook@11.0.0-beta.3 --type solid --yes --no-dev --features docs test --package-manager npm --disable-telemetry --no-agent` | Completed with "non-blocking errors". Wrote CSF 3 `.storybook/main.ts` + `.storybook/preview.tsx`, copied **CSF 3** stories (from `storybook-solidjs-vite@latest` 10.7.4), added `storybook-solidjs-vite@next`. Its npm install failed on a peer conflict in my starter (`@solidjs/web@2.0.0-rc.1` vs `@solidjs/vite-plugin@3.0.0-next.57` wants `^2.0.0-rc.19`); addon-vitest still configured `vite.config.ts` |
| 42  | set `solid-js`/`@solidjs/web` `^2.0.0`, `@solidjs/vite-plugin` `^3.0.0`; `npm install --min-release-age=0`     | ok; `storybook-solidjs-vite@11.0.0-next-20261105190313`, vitest 5.1.0                                                                                                                                                                       |
| 43  | `npx storybook build`                                                                                         | pass                                                                                                                                                                                                                                           |
| 44  | `npx vitest run --project=storybook`                                                                          | pass: 3 files / 8 tests                                                                                                                                                                                                                       |
| 45  | copy our `next` `template/cli/ts/*` over `src/stories`, keep the CSF 3 preview; vitest; `tsc`                 | **fail**: `TypeError: preview.meta is not a function` (3 files); `TS2339 Property 'meta' does not exist on type 'Preview$1'`                                                                                                                    |
| 46  | replace main/preview with the CSF 4 output `configure.ts` would write (`defineMain` from `storybook-solidjs-vite/node`, `definePreview` from `storybook-solidjs-vite`); vitest; `tsc` | pass: 3 files / 16 tests; `tsc` only TS2882 `.css` side-effect imports                                                                                                                                                                         |
| 47  | `npx storybook build` (CSF 4)                                                                                 | pass                                                                                                                                                                                                                                           |
| —   | `npx storybook automigrate skills --yes`                                                                      | "No migrations were applicable to your project" (Solid excluded by `supportsSkills`)                                                                                                                                                             |

Scaffold originals are saved at `/tmp/sb-research/scaffold-{main-csf3.ts,preview-csf3.tsx,stories-csf3/}`. The scaffold dir is left in its CSF 4 state.

## What the real upgrade change needs

1. Root: `storybook` and `@storybook/builder-vite` → `^11.0.0-beta.3`, add `ts-dedent` devDependency. Keep caret ranges (watch `save-exact`).
2. `examples/lab`: `storybook`, `@storybook/addon-docs`, `@storybook/addon-vitest` → `^11.0.0-beta.3`. `examples/solid1`: `storybook`, `@storybook/addon-docs` → `^11.0.0-beta.3`. Run `bun install --minimum-release-age=0` in each, so both lockfiles update.
3. Peer floor `storybook: ^11.0.0-beta.0 || ^11.0.0` can stay. `src/` uses nothing beta.3-only.
4. Update the `.briefback/docs/framework/*` snapshot text ("Snapshot: Storybook 11.0.0-beta.0", "`@storybook/builder-vite` is a dependency at `^11.0.0-beta.0`").
5. Add a changeset (user-facing dependency bump).

## Relevant files

- `/tmp/sb-research/wt/{package.json,bun.lock,examples/lab/package.json,examples/lab/bun.lock,examples/solid1/package.json,examples/solid1/bun.lock}`: the trial diff.
- `scripts/build-storybook.ts`: preset-load guard; it passed in both examples.
- `examples/lab/scripts/check-docgen.ts`: passed.

## Constraints

- `~/.bunfig.toml` `minimumReleaseAge = 259200` (3 days) and `~/.npmrc` `min-release-age=3`. beta.3 (2026-11-13) clears them now, but `--minimum-release-age=0` is still needed for freshly published deps.
- The lab Vitest run needs Playwright Chromium headless shell v1234 installed locally.

## Sources (2026-11-17)

- Logs: `/tmp/sb-research/logs/01`–`47-*.log`.
- npm registry (`storybook-solidjs-vite`, `solid-js`, `@solidjs/web`, `@solidjs/vite-plugin` dist-tags/times).

## Open questions

- Solid 2.0.0 (`solid-js`, `@solidjs/web`) and `@solidjs/vite-plugin` 3.0.0 went stable on 2026-11-17. The lab still pins `^2.0.0-0` and resolves `2.0.0-rc.1`. The scaffold on 2.0.0 passed with our `next` build. Bumping the lab to 2.0.0 is out of scope here but worth a follow-up.
- Root devDeps pin Vitest 4.1.11, while `storybook/test` is now Vitest 5-based and a fresh scaffold gets Vitest 5.1.0. Should the lab and root move to Vitest 5? Not tested here.

## Assumptions and limits

- `bun run lint` was not run (lint covers no `.ts` per react-parity.md).
- `storybook dev` was not started. The lab `[STRICT_READ_UNTRACKED]` warning was not compared against beta.0.
- The solid1 example has no Vitest suite; only its static build was checked.
