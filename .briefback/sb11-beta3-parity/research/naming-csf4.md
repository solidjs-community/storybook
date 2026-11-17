# Naming: "CSF 4" vs "CSF Next" / "CSF Factories"

## Summary

Snapshot 2026-11-17, `storybookjs/storybook` at `v11.0.0-beta.3`.

Upstream user-facing text calls the factory format **"CSF 4"**. The beta blog (2026-11-09) uses only "CSF 4". The docs use "CSF 4" throughout `docs/writing-stories/csf/{index,api,upgrade}.mdx` (tab title "Upgrade to CSF 4"). The migration guide mentions the old name exactly twice, as "CSF 4 (aka CSF Next)", and once as "CSF 4 (previously called CSF Next)". "CSF Next" survives upstream only in:

- the three `MIGRATION.md` 10→11 headings (`### CSF Next: …`, lines 1257/1276/1298, TOC 30–32);
- the automigration id `csf-next-mocked-args` and its prompt text;
- one JSDoc line copied in `react-vite/src/types.ts:57` / `builder-webpack5/src/types.ts:37` ("Enable the experimental `.test` function in CSF Next");
- `docs/releases/migration-guide-from-older-version.mdx:13`.

Identifiers and command ids keep "factories": the codemod `storybook automigrate csf-factories`, `supportsCsfFactories`, `csf-factories.ts`, `csf-factories.test.ts` in every renderer, and the type flag `csf4: true` (`core/src/csf/story.ts`). Fixture and template file names use `csf4`: `renderers/react/src/__test__/Button.csf4.stories.tsx`, `renderers/react/template/stories/csf4.stories.tsx`. Code comments mix "CSF factories" (`react/src/preview.tsx:34,86`) and "CSF4" (`create-storybook`).

The "CSF 4" docs wording was already present at beta.0 (`upgrade.mdx` title, 7 hits in `csf/index.mdx`). Our repo picked "CSF Next" from Storybook 10 docs.

Docs URL: the 10.x page `https://storybook.js.org/docs/api/csf/csf-next` still returns 200 (stable site). The 11 page is `docs/writing-stories/csf/api`, served today at `https://storybook.js.org/docs/11/writing-stories/csf/api` (200). `/docs/writing-stories/csf/api` returns 404 until 11 is the default (checked 2026-11-17).

## Rename rules (to match upstream)

1. In prose (README, MIGRATION, TESTING, changesets, docs, comments, test titles), write **"CSF 4"**. On the first mention in README and MIGRATION, add "(previously CSF Next)", as upstream's migration guide does.
2. Keep command and automigration ids verbatim: `csf-factories`, `csf-next-mocked-args`.
3. Keep `src/spec/preview/csf-factories.test.ts`. Every upstream renderer uses that file name.
4. Rename fixtures to the `csf4` pattern: `Button.csf-next.stories.ts` → `Button.csf4.stories.ts` (React: `Button.csf4.stories.tsx`).
5. Do **not** touch `./next` / `./next/preset` in `package.json` or `storybook-solidjs-vite/next` in `consumer.ts` / `CHANGELOG.md`. That subpath pins Solid 2 (PR #35 "Solid next") and has nothing to do with CSF.
6. Do not rewrite `CHANGELOG.md`. It is released history. Pending `.changeset/*.md` entries are not released yet, so update them.
7. Upstream code comments use "CSF factory/factories" for the mechanism. That is acceptable where the sentence is about factory functions. Prefer "CSF 4" where the sentence names the format.

## Public API

No exported type, function or package subpath uses "Next" or "Factories" for CSF: `definePreview`, `SolidPreview`, `SolidMeta`, `SolidStory`, `composeStories` etc. are neutral. Old-name identifiers are internal or test-only:

- `src/preview/portable-stories.ts:115` `type ComposedCsfNextStories` is **not exported**. Rename to `ComposedCsf4Stories`.
- `src/spec/packageExports/consumer.ts:51-94` `csfNextMeta`, `CsfNextPrimary`, `CsfNextTyped`, `CsfNextTypedComponent`, `CsfNextMissing`, `csfNextPortableStories`, `PortableCsfNext`. These are exports of a test consumer file, not of the package. Rename to `csf4Meta`, `Csf4Primary`, and so on.
- `src/framework/public-api.ts:38` JSDoc on `features.experimentalTestSyntax` ("in CSF Next") appears in published `.d.ts`. React's identical JSDoc still says "CSF Next" at beta.3. Change it to "CSF 4" (upstream will likely follow), or keep it byte-identical to React. This is a minor judgment call.

## Full inventory (working tree on `next`, 2026-11-17)

README.md and TESTING.md line numbers are from the user's **uncommitted** working copy (README modified, TESTING new).

| File:line | Text now | Should become |
| --- | --- | --- |
| `README.md:24` | `- [CSF Next](#csf-next) support` | `- [CSF 4](#csf-4) support` (anchor follows the heading) |
| `README.md:44` | `Choose CSF Next or CSF 3 to configure…` | `Choose CSF 4 or CSF 3…` |
| `README.md:46` | `### CSF Next` | `### CSF 4` (optionally a line "previously called CSF Next") |
| `MIGRATION.md:48` | `[CSF Next](./README.md#csf-next) stories` | `[CSF 4](./README.md#csf-4) stories`. The claim itself is also stale: `create-storybook` does not scaffold CSF 4 for Solid (`supportsCsfFactories(SOLID) === false` at beta.3) |
| `MIGRATION.md:50` | `storybook automigrate csf-factories` | keep (command id) |
| `MIGRATION.md:52` | `### CSF Next types` | `### CSF 4 types`. Update the cross-references in `.changeset/csf-next-types.md:16` and `.briefback/docs/framework/preview-and-csf.md:30` |
| `MIGRATION.md:54` | `…Storybook 11's CSF Next types… [Storybook 11 CSF Next notes]` | `CSF 4 types`, `[Storybook 11 CSF 4 notes]` |
| `TESTING.md:13` | `…in a CSF Next component test` | `…in a CSF 4 component test` |
| `TESTING.md:77` | ``play` also works with CSF Next`` | `CSF 4` |
| `TESTING.md:98` | `[CSF Next `.test` API](https://storybook.js.org/docs/api/csf/csf-next)` | `[CSF 4 `.test` API](https://storybook.js.org/docs/writing-stories/csf/api)` (live after 11 GA; until then `/docs/11/…`) |
| `TESTING.md:136` | `For **CSF Next**, the preview…` | `For **CSF 4**` |
| `TESTING.md:163` | `With **CSF Next**, import a story directly` | `With **CSF 4**` |
| `TESTING.md:196` | `composeStories also accepts CSF Next modules` | `CSF 4 modules` |
| `TESTING.md:224` | `CSF Next exposes Story.Component` | `CSF 4 exposes…` |
| `AGENTS.md:13` | `src/preview/ — definePreview / CSF Next preview` | `CSF 4 preview` |
| `.changeset/sb11-catchup.md:15` | `New scenarios use CSF Next (preview.meta() …)` | `CSF 4` |
| `.changeset/sb11-catchup.md:16` | `template/cli uses CSF Next` | `CSF 4` |
| `.changeset/sb11-catchup.md:30` | `import .storybook/preview (CSF Next)` | `(CSF 4)` |
| `.changeset/csf-next-types.md:5` | `### CSF Next types on Storybook 11's meta-args model` | `### CSF 4 types…`. The file name can stay (changeset ids are arbitrary) or become `csf4-types.md` |
| `.changeset/csf-next-types.md:16` | `MIGRATION.md → "CSF Next types"` | `"CSF 4 types"` |
| `.changeset/portable-stories.md:8` | `storybook automigrate csf-factories` | keep |
| `.briefback/docs/framework/modules.md:13` | `CSF 3/Next` | `CSF 3/4` (framework docs are hand-edited; only `BRIEFBACK.md` and the skill are generated) |
| `.briefback/docs/framework/preview-and-csf.md:3,26,30,36` | `CSF Next` ×4 (heading `## CSF Next`) | `CSF 4` |
| `.briefback/docs/framework/react-parity.md:21` | row `CSF Next types` | `CSF 4 types` |
| `.briefback/docs/framework/react-parity.md:23,52` | `csf-factories` codemod / `csf/csf-factories.ts` path | keep (id/path) |
| `.briefback/docs/framework/react-parity.md:36` | deliberate-difference row "template/cli stories are CSF Next" | remove: React templates are CSF 4 now (see [parity delta](./parity-delta.md)) |
| `.briefback/docs/framework/package-surface.md:14` | `csf-factories` codemod | keep |
| `examples/lab/README.md:3,5,31` | `CSF Next tests`, `New scenarios: CSF Next`, `CSF Next story.test()` | `CSF 4` |
| `src/framework/preset.ts:61` | JSDoc `…and CSF Next test syntax by default` | `CSF 4 test syntax` |
| `src/framework/public-api.ts:38` | JSDoc `Enable the experimental .test function in CSF Next` (published `.d.ts`) | `in CSF 4` (React still says CSF Next; judgment call) |
| `src/preview/define-preview.ts:38` | `Solid preview with type-safe CSF factories` | keep (React's `preview.tsx:34` says "CSF factories support"), or `CSF 4` |
| `src/preview/portable-stories.ts:111` | `…so CSF Next modules (meta.story() exports) fit` | `CSF 4 modules` |
| `src/preview/portable-stories.ts:115,161` | `type ComposedCsfNextStories` (internal) | `ComposedCsf4Stories` |
| `src/preview/portable-stories.ts:144` | `…as CSF Next stories files do` | `CSF 4` |
| `src/spec/preview/csf-factories.test.ts:1` | `// Type tests for CSF Next, adapted from…csf-factories.test.tsx` | `CSF 4`; file name stays |
| `src/spec/preview/csf-factories.test.ts:194` | `describe('Custom args types written by the csf-factories codemod'` | keep (codemod id) |
| `src/spec/preview/fixtures/Button.csf-next.stories.ts` (file) | file name | `Button.csf4.stories.ts`; update the import in `portable-stories.test.ts:11` |
| `src/spec/preview/fixtures/Button.csf-next.stories.ts:7` | `title: 'Portable/CSFNext'` | `'Portable/CSF4'` |
| `src/spec/preview/fixtures/Button.csf-next.stories.ts:13` | `label: 'CSF Next primary'` | `'CSF 4 primary'` (asserted in `portable-stories.test.ts:41`) |
| `src/spec/preview/portable-stories.test.ts:11` | `import * as csfNextStories from './fixtures/Button.csf-next.stories'` | `csf4Stories` from `./fixtures/Button.csf4.stories` |
| `src/spec/preview/portable-stories.test.ts:14-15` | comments `CSF Next fixture`, `CSF Next project` | `CSF 4` |
| `src/spec/preview/portable-stories.test.ts:41` | `['CSF Next', …, 'CSF Next primary']` | `['CSF 4', …, 'CSF 4 primary']` |
| `src/spec/renderer/test-syntax-guard.test.ts:47` | `…and their CSF Next preview addons` | `CSF 4` |
| `src/spec/componentManifest/solidComponentMeta/storyResolution.test.ts:140` | `describe('cSF Next preview.meta → docgen'` | `'CSF 4 preview.meta → docgen'`. The odd `cSF` came from an earlier lowercase-title lint. `.ts` files are now outside lint (`eslint.config.mjs`: `typescript: false`) |
| `src/spec/componentManifest/solidComponentMeta/storyResolution.test.ts:143,173` | labels `CSF Next args-only`, `CSF Next render JSX` | `CSF 4 …` |
| `src/spec/codeExamples/generateCodeSnippet.test.ts:33,89-90` | `withCSF4`, `'default - CSF4'` | already matches upstream style; optionally `CSF 4` in the title |
| `src/spec/codeExamples/generateCodeSnippet.test.ts:184` | `it('cSF Next preview.meta story with args'` | `'CSF 4 preview.meta story with args'` |
| `src/spec/packageExports/consumer.ts:30` | comment `storybook automigrate csf-factories` | keep |
| `src/spec/packageExports/consumer.ts:51-94` | `csfNextMeta`, `CsfNext*`, `PortableCsfNext`, `csfNextPortableStories` | `csf4Meta`, `Csf4*`, `PortableCsf4`, `csf4PortableStories` |
| `CHANGELOG.md:13,102,118,124,158,160,177` | released entries ("CSF factory", "CSF4", "### CSF Next (optional)") | leave (history) |

No hits in `template/`, `examples/solid1/`, or `examples/lab/src/` (grep run 2026-11-17).

## Sources

- `/tmp/sb-research/sb` at `v11.0.0-beta.3`: `docs/writing-stories/csf/*.mdx`, `docs/releases/migration-guide.mdx:131,211,254`, `MIGRATION.md:30-32,1257-1298`, `code/lib/create-storybook/src/generators/csf-factories.ts`, `code/core/src/csf/story.ts`, `code/renderers/react/src/preview.tsx`, read 2026-11-17.
- https://storybook.js.org/blog/storybook-11-beta/ (published 2026-11-09, updated 2026-11-16, read 2026-11-17).
- HTTP status checks of the docs URLs on 2026-11-17.

## Open questions

- Will upstream rename the `MIGRATION.md` "CSF Next:" headings and the `experimentalTestSyntax` JSDoc before GA? If it does, our anchors to `#csf-next-*` headings would move. We link only to `docs/releases/migration-guide`, not to those anchors.

## Assumptions and limits

- The grep covered `csf[ -]?next`, `csf[ -]?factor`, `csf[ -]?4`, `csfNext`, `3/Next`, case-insensitive, excluding `node_modules`, `dist`, `.pack`, `.git`, `bun.lock`.
- I did not establish when upstream first adopted "CSF 4": the blobless clone could not run history searches before beta.0.
