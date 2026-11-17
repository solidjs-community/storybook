# Upstream Storybook changes for Solid

What to change in `storybookjs/storybook` so Solid gets CSF 4 scaffolds, the official agent skills, and stops being listed as broken. Based on tag `v11.0.0-beta.3` and checked against `next` (`fc968f8b74e`) on 2026-11-17. Evidence is in [research](./research/).

## Before you start

- Storybook's [CONTRIBUTING](https://github.com/storybookjs/storybook/blob/next/CONTRIBUTING.md#about-ai-contributions-never-let-an-llm-speak-for-you): open the PR yourself with the PR template, and name any AI tool that helped. Fully agent-made PRs are closed after 3 days.
- Branch from `next`. Setup: `yarn` at the repo root, then work in `code/`.
- One PR. The code change is about 10 lines, and its only precondition (our Storybook 11 build published on `next`) is already met.

## Deadline

`create-storybook` copies community templates from our **`latest`** dist-tag before install (`code/core/src/cli/dirs.ts`, `resolveUsingBranchInstall`, which has a `FIXME` about this), but installs our **`next`** during a Storybook prerelease and our **`latest`** once Storybook is stable (`code/lib/create-storybook/src/community-frameworks.ts`).

We promote our `next` to `latest` the moment Storybook 11.0 goes stable. So **the PR must ship in a Storybook release before 11.0 stable**.

| Storybook | Our `latest` | PR merged? | `create-storybook --type solid` result |
| --- | --- | --- | --- |
| 11 prerelease | 10.7.4 (CSF 3 templates) | no | Works: CSF 3 everything (today) |
| 11 prerelease | 10.7.4 (CSF 3 templates) | yes | CSF 4 `main`/`preview` + CSF 3 stories. Checked by the sandbox step below |
| 11 stable | 11.x (CSF 4 templates) | yes | Works: CSF 4 everything (observed, 16/16 story tests) |
| 11 stable | 11.x (CSF 4 templates) | no | **Broken**: `preview.meta is not a function` (observed) |

If the PR misses 11.0 stable, ship CSF 3 `template/cli` in our first 11.x `latest`.

Between Storybook 11.0.0 publishing and our promotion, init installs 10.7.4, which does not load on Storybook 11. Keep that gap short.

## The PR

Title: `CLI: Support CSF 4 scaffolds and agent skills for SolidJS`

### CSF 4 scaffolds

- `code/lib/create-storybook/src/generators/csf-factories.ts` → `supportsCsfFactories`: move `case SupportedFramework.SOLID:` into the `return true` group. Delete the comment `// already ships definePreview; blocked on exporting defineMain from ./node`.
- `code/lib/create-storybook/src/generators/csf-factories.test.ts:44`: `[SupportedFramework.SOLID, false]` → `true`.

Why it is now true: `storybook-solidjs-vite@next` (`11.0.0-next-20261105190313`) exports `./node` with `defineMain`, its root `definePreview` accepts the `addons: []` the CSF 4 preview template writes, and its `template/cli` stories are CSF 4 and import `../../.storybook/preview` (rewritten by `rewriteCopiedStoryPreviewImports`).

Do not add `modifications.useCsfFactory: true` to the `solid-vite/default-ts` sandbox template, even though other CSF 4 templates have it. It runs the `csf-factories` automigration on the sandbox, which would convert the CSF 3 stories from our 10.7.4 templates and hide the mixed case we want CI to cover.

### Agent skills

- `code/core/src/cli/installSkills.ts` → `supportsSkills`: add `renderer === SupportedRenderer.SOLID ||` to the returned condition.
- `code/core/src/cli/installSkills.test.ts` (`describe('supportsSkills')`): add `[SupportedRenderer.SOLID, SupportedFramework.SOLID, true]`.

Why: the gate's own criterion is a docgen server, which we have. `storybook tools` already returns correct Solid data with no dev server (observed in our lab at beta.3): `docs list`, `docs show --id`, `docs show-story`, `stories find-by-component`, `test run`. Today `init` never offers the AI feature for Solid and `storybook automigrate skills` reports "not applicable". Both paths reach `supportsSkills` with `SupportedRenderer.SOLID` (`frameworkToRenderer` already maps Solid), so the one line covers init and upgrade.

Do not ask for `supportsAiSetup` (`storybook skills setup`); Svelte and Web Components do not have it either.

### Stop listing Solid as broken

- `code/lib/cli-storybook/src/sandbox-templates.ts`, `'solid-vite/default-ts'`: remove `'chromatic'` from `skipTasks` and the comment block above it that points at solidjs-community/storybook#76.
- `MIGRATION.md`, "Community packages that need a release": remove the `storybook-solidjs-vite` bullet. Optionally add a sentence naming the first working version.

Sandboxes enforce a 7-day `npmMinimalAgeGate`. Our current `next` is old enough; a new `next` published before CI runs the Solid sandbox will fail it for a week.

### Verify

- `yarn test code/lib/create-storybook/src/generators/csf-factories.test.ts code/core/src/cli/installSkills.test.ts`
- `yarn task sandbox --template solid-vite/default-ts --start-from auto`. In `../storybook-sandboxes/solid-vite-default-ts`, check `.storybook/main.ts` imports `defineMain` from `storybook-solidjs-vite/node` and `preview.ts` uses `definePreview`. The stories are CSF 3 (copied from our 10.7.4 `latest`), so this is the mixed case from the table.
- `yarn task build --template solid-vite/default-ts --start-from auto`, and open the built Storybook to confirm the stories render.
- `yarn task chromatic --template solid-vite/default-ts` if you have a Chromatic token. Otherwise ask a maintainer for the `ci:daily` label: the Solid sandbox is in the `daily` list, not `normal`.

If Chromatic blocks the PR, drop the "Stop listing Solid as broken" part into a follow-up rather than holding the rest.

## Optional

- **Docs.** Follow-up PR, not this one. The framework support table is now in `docs/ai/reference/manifests.mdx#framework-support` (`docs/ai/mcp/overview.mdx` was deleted on `next`): add `storybook-solidjs-vite` | `On by default` above "Every other framework". That alone is not enough: `solid` is a docs renderer (`docs/frameworks.js`), and `manifests.mdx`, `published-storybook.mdx` and the `docs/ai/skills/` pages gate content on `<If renderer={['react', 'vue', 'angular', 'svelte', 'web-components']}>`, so Solid readers would still be told their framework has no components manifest. `docs/writing-stories/csf/index.mdx:15` lists where CSF 4 is supported the same way. Expect pushback on documenting a community framework; ask a maintainer first.
- **Engine id.** If we switch our manifest engine from `react-component-meta` to `solid-component-meta`, add `'solid-component-meta'` to `ComponentsManifest['meta']['docgen']` in `code/core/src/types/modules/core-common.ts` (around line 502). Not needed while we report `react-component-meta`.
- **Templates from the installed tag.** Open an issue (not a PR) about `resolveUsingBranchInstall` downloading community templates from `latest` while init installs `next`. Fixing it removes the deadline above for every community framework.
