# CSF 4 naming, `create-storybook`, and our `template/cli`

## Summary

- **Naming.** The public name is now **"CSF 4"** ("CSF 4 (previously called CSF Next)" / "aka CSF Next"). Code and APIs did not rename: `definePreview`, `preview.meta()`, `meta.story()`, `defineMain` from `<framework>/node`. The automigration id is still `csf-factories` (`npx storybook automigrate csf-factories`). The skill output says "CSF Factories". `MIGRATION.md` headings still say "CSF Next: …". Code comments use "CSF4".
- **Templates moved.** beta.1 (#37125 "CLI: Scaffold CSF4 from storybook init") moved React, Vue 3 and Web Components `template/cli` stories to `preview.meta()` importing `../../.storybook/preview`. It also added a per-framework opt-in, `supportsCsfFactories()`.
- **Solid is opted out.** `supportsCsfFactories(SupportedFramework.SOLID)` returns `false` with the comment `// already ships definePreview; blocked on exporting defineMain from ./node`. That reason is out of date: `storybook-solidjs-vite@next` (`11.0.0-next-20261105190313`) and our `next` branch export `defineMain` from `./node`. Community frameworks can opt in (`REACT_RSBUILD`, `VUE3_RSBUILD`, `WEB_COMPONENTS_RSBUILD`, `ASTRO` return `true`).
- **Today a fresh scaffold works, but by accident** (observed). `create-storybook@11.0.0-beta.3 --type solid` writes a CSF 3 `main.ts`/`preview.tsx` and copies the **CSF 3** stories of `storybook-solidjs-vite@latest` (10.7.4). Templates are downloaded from `latest` before install (a known upstream FIXME), while `package.json` gets `storybook-solidjs-vite@next`. Build and story tests pass.
- **It breaks once our CSF 4 templates reach the scaffold** while Solid is still opted out (observed). Our CSF 4 template stories with the CSF 3 preview fail with `TypeError: preview.meta is not a function` (Vitest) and `TS2339: Property 'meta' does not exist on type 'Preview$1'`. With the CSF 4 `main`/`preview` that `configureMain`/`configurePreview` write for opted-in frameworks, the same templates build and all 16 story tests pass (observed).
- **What to do.** Open an upstream PR that flips `SupportedFramework.SOLID` to `true` in `code/lib/create-storybook/src/generators/csf-factories.ts` and its test row. It must land before a release with our CSF 4 `template/cli` becomes `storybook-solidjs-vite@latest`. Otherwise, ship CSF 3 templates until it lands. Flipping is safe even while `latest` still has CSF 3 templates: CSF 3 story files run under a `definePreview` preview, and the import rewrite only touches `.storybook/preview` imports.

## How it works

### Official naming (beta.3)

| Where                                             | Term                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Docs `writing-stories/csf/upgrade.mdx`            | "Upgrade to CSF 4", "CSF 4 is the next evolution…"                                         |
| Docs `releases/migration-guide.mdx`               | "CSF 4 (previously called CSF Next) … is the recommended story format in Storybook 11. … CSF 4 is available for React, Vue, Angular, Web Components, and Svelte." (no Solid) |
| Docs snippets                                     | `tabTitle="CSF 4"`: 655 React, 529 Vue, 525 WC, 266 Svelte, 276 Angular. **0 of 103 Solid snippets** have a CSF 4 tab |
| Automigration / codemod                           | `csf-factories` (unchanged); `csf-next-mocked-args` ("in CSF 4 (aka CSF Next) stories")    |
| Codemod messages (`cli-storybook/src/codemod/csf-factories.ts`) | "the new CSF 4 format"                                                          |
| `storybook skills write-stories` output           | "This project writes stories with CSF Factories, because `.storybook/preview.tsx` uses `definePreview`" |
| `MIGRATION.md`                                    | "CSF Next: meta args no longer need `as const`" etc. (headings not renamed)                |
| Types / APIs                                      | unchanged: `definePreview`, `Preview`, `Meta`, `Story`, `MetaInput`, `StoryArgs` in `storybook/internal/csf` |
| Blog (2026-11-09, updated 2026-11-16)             | "CSF 4 … fully type-safe … 'factories' API"; "CSF 3 remains fully supported"               |

So our docs and changesets can say "CSF 4 (formerly CSF Next)". No code rename is needed. `react-parity.md` / `preview-and-csf.md` / `MIGRATION.md` in our repo still say "CSF Next".

### The `csf-factories` codemod (`code/lib/cli-storybook/src/codemod/csf-factories.ts`)

The codemod is framework-agnostic. It reads the framework package from `main` and writes `import { defineMain } from '<framework>/node'` and `import { definePreview } from '<framework>'`. beta.3 runs csf-2-to-3 in-process before converting (`storyToCsf4`). It has no framework allowlist, so Solid users can run `npx storybook automigrate csf-factories` (not run in this research).

### `create-storybook` flow for `--type solid` (beta.3)

1. `generators/SOLID/index.ts`: `{ projectType: SOLID, renderer: SOLID, framework: SOLID, builderOverride: VITE }`, `addComponents: true` (unchanged since beta.0).
2. `generators/baseGenerator.ts` `baseGenerator()`:
   - `csfFactories = supportsCsfFactories(framework)` → `false` for SOLID.
   - `configureMain({ csfFactories })` → CSF 3 `const config: StorybookConfig = …` with `import type { StorybookConfig } from 'storybook-solidjs-vite'`. With `true`, it writes `export default defineMain(…)` with `import { defineMain } from 'storybook-solidjs-vite/node'`.
   - `configurePreview({ csfFactories })` → `.storybook/preview.tsx` (`isJsx` includes SOLID). CSF 3 gives `const preview: Preview = {…}`. CSF 4 gives `import { definePreview } from 'storybook-solidjs-vite'` + `export default definePreview({ addons: [], parameters: {…} })`.
   - `copyTemplateFiles({ templateLocation: framework })`: SOLID is in `hasFrameworkTemplates`, so it copies `<storybook-solidjs-vite>/template/cli/{ts|js}` to `src/stories` (or `stories`).
   - Only when `csfFactories` is true: `rewriteCopiedStoryPreviewImports` rewrites `from '…/.storybook/preview'` to the real relative path. Without it, a project with no `src/` gets `stories/*.stories.ts` importing `../../.storybook/preview`, which is the wrong depth.
3. `core/src/cli/dirs.ts` `getRendererDir()` resolves the framework package from cwd. That fails in a fresh project, because templates are copied **before** dependencies install. It then falls back to `resolveUsingBranchInstall()`, which downloads `versions[name] || packageManager.latestVersion(request)`, i.e. the **`latest`** dist-tag (`// FIXME: this might not be the right version for community packages`).
4. `community-frameworks.ts` (new, #37203): during a Storybook prerelease, the framework package is installed as `@next` when `next` is newer than `latest`. Observed: `storybook-solidjs-vite@next` in `devDependencies`.

So the templates and the installed package can come from different dist-tags.

### Current published state (npm, 2026-11-17)

- `storybook-solidjs-vite` dist-tags: `latest: 10.7.4` (CSF 3 templates, no `./node`), `next: 11.0.0-next-20261105190313` (has `./node` + `defineMain`, CSF 4 templates, peer `storybook ^11.0.0-beta.0 || ^11.0.0`).

### Observed scaffold matrix (`/tmp/sb-research/scaffold`, Solid 2.0.0, storybook 11.0.0-beta.3, npm)

| main / preview                      | stories                                   | `storybook build` | `vitest --project=storybook`      | `tsc`                              |
| ----------------------------------- | ----------------------------------------- | ----------------- | --------------------------------- | ---------------------------------- |
| CSF 3 (as generated)                | CSF 3 (from `latest` 10.7.4, as generated) | pass              | 3 files / 8 tests pass            | only TS2882 `.css` side-effect imports |
| CSF 3 (as generated)                | CSF 4 (our `next` `template/cli/ts`)       | not run           | **3 files fail: `preview.meta is not a function`** | **TS2339 `meta` not on `Preview$1`** + implicit-any `canvas` |
| CSF 4 (`defineMain` + `definePreview`, as upstream would write) | CSF 4 (our `next` `template/cli/ts`) | pass              | 3 files / 16 tests pass           | only TS2882                        |

TS2882 is `Cannot find module or type declarations for side-effect import of './button.css'`. It comes from the scaffold's `tsconfig` (TS 6 checks side-effect imports) and has nothing to do with CSF.

## What we must change

1. **Upstream (storybookjs/storybook)**: in `code/lib/create-storybook/src/generators/csf-factories.ts`, move `case SupportedFramework.SOLID:` into the `return true` group and delete the stale comment. Update the `[SupportedFramework.SOLID, false]` row in `csf-factories.test.ts:44`. Evidence for the PR: `storybook-solidjs-vite@next` exports `./node` → `defineMain`, root `definePreview`, and CSF 4 `template/cli` (paths `../../.storybook/preview`, matching the `rewriteCopiedStoryPreviewImports` convention).
2. **Release ordering**: do not let a release with CSF 4 `template/cli` become `latest` before step 1 ships in a Storybook release that users run. Otherwise `npx storybook init` on a Solid project produces stories that crash. Fallback: ship CSF 3 `template/cli` (as 10.7.4 did) until the flip lands.
3. **Our docs**: rename "CSF Next" → "CSF 4 (formerly CSF Next)" in `MIGRATION.md`, `README.md`, `.briefback/docs/framework/{react-parity,preview-and-csf}.md`. Update the `react-parity.md` "Deliberate differences" row: React templates are now CSF 4 too (`code/renderers/react/template/cli/*`, beta.1), so `template/cli` is at parity and no longer a deliberate difference. The remaining gap is the `create-storybook` opt-in.
4. **Optional**: React added `code/renderers/react/template/.storybook/preview.ts` (`export default __definePreview({ addons: [] })`) as a typecheck target for the CSF 4 template stories. We could add the same (a `template/.storybook/preview.tsx` using our `definePreview`) plus a typecheck of `template/cli/ts`. That catches template drift. Check that `files: ["template/**/*"]` would not then ship it into scaffolds: `copyTemplateFiles` only copies `template/cli/<lang>`.
5. **Optional upstream docs**: Solid has 103 snippet blocks and no CSF 4 tab, and the migration guide lists CSF 4 renderers without Solid.

## Relevant files and modules

- `template/cli/{ts,js}/*.stories.*` (ours): already CSF 4, importing `../../.storybook/preview`.
- `src/node.ts`, `src/index.ts`, `package.json` `exports["./node"]` (ours): what `configureMain`/`configurePreview` import in CSF 4 mode.
- `code/lib/create-storybook/src/generators/csf-factories.ts`: `supportsCsfFactories`, `rewriteCopiedStoryPreviewImports`.
- `code/lib/create-storybook/src/generators/configure.ts`: `configureMain`, `configurePreview`.
- `code/lib/create-storybook/src/generators/baseGenerator.ts`: orchestration, `hasFrameworkTemplates`.
- `code/lib/create-storybook/src/community-frameworks.ts`: `@next` vs `latest` for community frameworks.
- `code/core/src/cli/dirs.ts`: `getRendererDir` / `resolveUsingBranchInstall` (templates from `latest`).
- `code/core/src/cli/helpers.ts`: `copyTemplateFiles`.
- `code/lib/cli-storybook/src/codemod/csf-factories.ts`: the `csf-factories` automigration.
- `code/renderers/react/template/{cli,.storybook/preview.ts}`: reference CSF 4 templates.

## Constraints

- The templates `create-storybook` copies come from the `latest` dist-tag of `storybook-solidjs-vite` in a fresh project, not from the version it installs.
- `rewriteCopiedStoryPreviewImports` runs only for opted-in frameworks. Without it, the `../../.storybook/preview` path is right only for `src/stories`.
- The ESLint rule `storybook/static-csf-properties` requires the `preview.meta()` factory to come from a `.storybook/preview` path.

## Sources (retrieved 2026-11-17)

- Storybook `v11.0.0-beta.3`: files listed above; `CHANGELOG.prerelease.md` (beta.1: #37125, #37203); `docs/writing-stories/csf/upgrade.mdx`; `docs/releases/migration-guide.mdx`; `docs/_snippets/*`.
- https://storybook.js.org/blog/storybook-11-beta/ (post 2026-11-09, updated 2026-11-16).
- npm registry: `npm view storybook-solidjs-vite dist-tags` / `@next exports`.
- Trial logs: `/tmp/sb-research/logs/41-create-storybook.log`, `43`–`47-*.log`. Scaffold at `/tmp/sb-research/scaffold` (left in its CSF 4 state; originals saved as `/tmp/sb-research/scaffold-{main-csf3.ts,preview-csf3.tsx,stories-csf3/}`).

## Open questions

- Will upstream accept the SOLID flip during beta, and in which release? Is anyone already tracking it upstream?
- Should we also ask upstream to fix the `resolveUsingBranchInstall` FIXME, so community templates come from the same dist-tag that is installed?
- JS template (`template/cli/js`) under CSF 4 was not scaffolded (only `ts` was tried).

## Assumptions and limits

- The scaffold used npm, a hand-made minimal Solid 2 project (not `create-solid`), and `--features docs test`. The first dependency install failed on an unrelated peer conflict in my starter (`@solidjs/web@2.0.0-rc.1` vs `@solidjs/vite-plugin@3.0.0-next.57`) and was redone with Solid 2.0.0. Templates were copied before that install, which is the normal order.
- The CSF 4 `main`/`preview` in the third row were written by hand to match `configure.ts` output. Upstream did not generate them.
- `storybook dev` was not started for the scaffold. Rendering was checked through Vitest browser tests and `storybook build`.
