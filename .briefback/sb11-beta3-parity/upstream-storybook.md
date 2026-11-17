# Upstream Storybook changes for Solid

What to change in `storybookjs/storybook` so Solid gets CSF 4 scaffolds, the official agent skills, and stops being listed as broken. Based on tag `v11.0.0-beta.3`, read 2026-11-17. Evidence is in [research](./research/).

## Before you start

- Storybook's [CONTRIBUTING](https://github.com/storybookjs/storybook/blob/next/CONTRIBUTING.md#about-ai-contributions-never-let-an-llm-speak-for-you): open each PR yourself with the PR template, and name any AI tool that helped. Fully agent-made PRs are closed after 3 days.
- Branch from `next`. Setup: `yarn` at the repo root, then work in `code/`.
- One PR per item below. They are independent and small.

## Order matters

`create-storybook` copies community templates from our **`latest`** dist-tag before install (`code/core/src/cli/dirs.ts`, `resolveUsingBranchInstall`), but installs our **`next`** during a Storybook prerelease (`code/lib/create-storybook/src/community-frameworks.ts`).

| Our `latest` | PR 1 merged? | `create-storybook --type solid` result |
| --- | --- | --- |
| 10.7.4 (CSF 3 templates) | no | Works: CSF 3 everything (today) |
| 11.x (CSF 4 templates) | no | **Broken**: `preview.meta is not a function` (observed) |
| 11.x (CSF 4 templates) | yes | Works: CSF 4 everything (observed, 16/16 story tests) |
| 10.7.4 (CSF 3 templates) | yes | CSF 4 `main`/`preview` + CSF 3 stories. Should work (mixing formats across files is supported) but **not tested** |

So: land PR 1 in a Storybook release **before** promoting our 11.x to `latest`. If that slips, ship CSF 3 `template/cli` in our first 11.x `latest`.

## PR 1: Scaffold CSF 4 for Solid

Title: `CLI: Scaffold CSF 4 for SolidJS`

- `code/lib/create-storybook/src/generators/csf-factories.ts` → `supportsCsfFactories`: move `case SupportedFramework.SOLID:` into the `return true` group. Delete the comment `// already ships definePreview; blocked on exporting defineMain from ./node`.
- `code/lib/create-storybook/src/generators/csf-factories.test.ts:44`: `[SupportedFramework.SOLID, false]` → `true`.

Why it is now true: `storybook-solidjs-vite@next` (`11.0.0-next-20261105190313`) exports `./node` with `defineMain`, its root `definePreview` accepts the `addons: []` the CSF 4 preview template writes, and its `template/cli` stories are CSF 4 and import `../../.storybook/preview` (rewritten by `rewriteCopiedStoryPreviewImports`).

Verify:
- `yarn test code/lib/create-storybook/src/generators/csf-factories.test.ts`
- `yarn task --task sandbox --template solid-vite/default-ts --start-from=install`, then check the sandbox's `.storybook/main.ts` imports `defineMain` from `storybook-solidjs-vite/node` and `preview.ts` uses `definePreview`.

## PR 2: Agent skills for Solid

Title: `CLI: Offer agent skills for SolidJS`

- `code/core/src/cli/installSkills.ts` → `supportsSkills`: add `renderer === SupportedRenderer.SOLID ||` to the returned condition.
- `code/core/src/cli/installSkills.test.ts` (`describe('supportsSkills')`): add `[SupportedRenderer.SOLID, SupportedFramework.SOLID, true]`.
- `docs/ai/mcp/overview.mdx`, "Framework support" table: add a row `storybook-solidjs-vite` | `componentsManifest` | `Yes`, above "Every other framework". Note that our preset enables `docgenServer` and `componentsManifest` by default.

Why: the gate's own criterion is a docgen server, which we have. `storybook tools` already returns correct Solid data with no dev server (observed in our lab at beta.3): `docs list`, `docs show --id`, `docs show-story`, `stories find-by-component`, `test run`. Today `init` never offers the AI feature for Solid and `storybook automigrate skills` reports "not applicable".

Do not ask for `supportsAiSetup` (`storybook skills setup`); Svelte and Web Components do not have it either.

Verify: `yarn test code/core/src/cli/installSkills.test.ts`.

## PR 3: Stop listing Solid as broken

Do this after our Storybook 11 release is published (at least `next`; ideally `latest` once PR 1 has shipped).

Title: `Build: Re-enable Chromatic for the SolidJS sandbox`

- `code/lib/cli-storybook/src/sandbox-templates.ts`, `'solid-vite/default-ts'`: remove `'chromatic'` from `skipTasks` and the comment block above it that points at solidjs-community/storybook#76.
- `MIGRATION.md`, "Community packages that need a release": remove the `storybook-solidjs-vite` bullet. Optionally add a sentence naming the first working version.

Verify: `yarn task --task chromatic --template solid-vite/default-ts` if you have a Chromatic token, otherwise ask a maintainer for the `ci:normal` label so CI runs the sandbox.

## Optional

- **Docs mention.** `docs/writing-stories/csf/index.mdx:15` lists where CSF 4 is supported (React, Vue, Angular, Web Components, Svelte). Core docs do not list community frameworks elsewhere either, so expect pushback; skip unless a maintainer suggests it.
- **Engine id.** If we switch our manifest engine from `react-component-meta` to `solid-component-meta`, add `'solid-component-meta'` to `ComponentsManifest['meta']['docgen']` in `code/core/src/types/modules/core-common.ts` (around line 502). Not needed while we report `react-component-meta`.
- **Templates from the installed tag.** Open an issue (not a PR) about `resolveUsingBranchInstall` downloading community templates from `latest` while init installs `next`. Fixing it removes the ordering problem above for every community framework.
