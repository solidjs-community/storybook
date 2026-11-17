# Core changes v11.0.0-beta.0 → v11.0.0-beta.3 that affect `storybook-solidjs-vite`

## Summary

- **Nothing we import broke.** Every named import from `storybook/internal/*`, `storybook/preview-api`, `storybook/test` and `@storybook/builder-vite` in `src/` still exists at beta.3. Root `bun run typecheck` and all 280 unit tests pass on beta.3 (observed, see [upgrade trial](./upgrade-trial.md)).
- **One repo fix is needed.** `ts-dedent`, which two spec files import, was only a transitive dependency of `@storybook/builder-vite@11.0.0-beta.0`. beta.3 dropped it, so typecheck and two test files fail until `ts-dedent` is added to root `devDependencies` (observed).
- The provider contracts we implement (`experimental_docgenProvider` worker, `experimental_storyDocsProvider`, `experimental_manifests`, `internal_getArgTypesData`) are unchanged. The one addition is the optional `StoryDoc.template` for the new **live snippets** feature, which is behind `features.experimentalLiveServerSnippets` (off by default). It is a parity item, not a break.
- **Upstream text still calls us broken.** `MIGRATION.md` lists `storybook-solidjs-vite` under "Community packages that need a release". The `solid-vite/default-ts` sandbox is skipped in Chromatic with a comment pointing at solidjs-community/storybook#76. Both need an upstream follow-up once a Storybook-11-compatible release is published. (The `next` dist-tag `11.0.0-next-20261105190313` already works with beta.3; see [upgrade trial](./upgrade-trial.md).)
- `create-storybook` changes (CSF 4 scaffolding, community dist-tags) are in [CSF 4 and templates](./csf4-and-templates.md). Skills and `storybook tools` are in [agent tooling](./agent-tooling.md).

## How it works / what changed

### Imports we use, checked at beta.3

Every import was extracted from `src/` (a script over `import {…} from 'storybook…'`), then checked by `tsc` against beta.3 types. Typecheck passed. The core diffs per module:

| Module                              | Change beta.0→beta.3                                                                                                                                                                                                                                 | Effect on us                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `storybook/internal/csf-tools`      | `CsfFile.ts` moved `isCanonicalCsf2BindCall`, `withoutTypeCalls`, `isCsfFactoryCall`, `csfFactoryReceiver` into `estree/ast.ts`/`nodes.ts` and re-exports them. `isValidPreviewPath` moved to `storybook/internal/csf` (`csf-utils.ts`), and csf-tools no longer exports it (commit `8e5573ebbb`). | None: we import `isCanonicalCsf2BindCall` (still exported) and not `isValidPreviewPath`. |
| `storybook/internal/component-meta` | `index.ts` also exports the `ProjectCommandLine` type. No source change to `ComponentMetaManager` / `ProgramBackedProject` / `ProjectFileTracker`.                                                                                                     | None. The private `getOrCreateConfiguredProject` hook still exists (`tsconfigProjectReferences.test.ts` passes). |
| `storybook/internal/common`         | Adds exports `typescript-7-1-stable`, `typescript-7-react-docgen-fallback`, `builder-docgen-packages`. `typescript-for-docgen.ts` was reworked (+371 lines): `isTypeScriptReadyForDocgen(resolve, options, { apis, builderDocgenFallback })`, `getTypeScriptSpecifierForDocgen`. | None: we do not call these. We bundle `@typescript/typescript6` (deliberate difference). |
| `storybook/internal/docs-tools`     | New `snippetTemplate.ts` (`SnippetTemplate`, `TemplateHole`, `PrintHole`, `fillTemplate`, `withHoleSpace`, `UnprintableArgError`, `unknownHoleKind`) and `snippetValues.ts` (`printValue`, …).                                                     | Optional parity: live snippets.                                                    |
| `storybook/internal/types`          | `TypescriptOptions.docgenSpecifier?`. `features.experimentalLiveServerSnippets?`. The `componentsManifest` doc now lists Svelte as default-on.                                                                                                        | None required.                                                                     |
| `storybook/internal/csf`            | `isValidPreviewPath` added (see above).                                                                                                                                                                                                              | None.                                                                              |
| `storybook/test`                    | Based on `@vitest/expect`/`@vitest/spy` 5 and `@testing-library/jest-dom` 7, now **bundled**: `storybook` no longer installs `@testing-library/*`, `chai`, `@vitest/*` (MIGRATION "storybook/test is based on Vitest 5…"). `configure()` must come from `storybook/test`. | `src/renderer/shared/before-all.ts` already imports `configure` from `storybook/test`. |
| `@storybook/builder-vite`           | Dropped its `ts-dedent` dependency. Small changes to the code-generator, mocker and stats plugins.                                                                                                                                                   | Root spec files lose `ts-dedent` (see Summary).                                    |
| `storybook` package deps            | Many deps bundled or removed (`@testing-library/*`, `@vitest/*`, `chai`, `semver`, `ws`, `open`, `jsonc-parser`, `use-sync-external-store`).                                                                                                          | We declare our own `semver`. No other implicit reliance was found (typecheck and tests green). |

### Docgen / story-docs / manifest contracts

- `services/docgen/definition.ts`, `services/story-docs/definition.ts`: the handlers read state through `readComponent()` (`component-state-key.ts`). It escapes reserved ids such as `constructor` as `~constructor` (#37157). This is internal to core: providers still return `DocgenPayload` / `StoryDocsPayload` keyed by plain id.
- `services/story-docs/types.ts`: `StoryDoc.template?: SnippetTemplate` (new). The output schema drops unknown keys, so extra fields stay harmless.
- `core-server/presets/common-preset.ts`: passes `liveSnippets: features.experimentalLiveServerSnippets` and the channel to the docgen/story-docs module-graph subscriptions, and adds a `getStoriesMatcher`.
- `core-server/utils/manifests/*`: switched to `getOwn`/`readAllComponents` (reserved-id safety). No shape change to the `v: 1` ref manifest.
- **Live snippets** (`services/story-docs/README.md` "Live snippets", `live-snippet.ts`): when the flag is on, the provider emits `template` next to `snippet`. The renderer sets `parameters.docs.source.printHole` (a `PrintHole`) in its docs preview entry, and the preview fills holes as controls change. While the flag is on, a story with no template that has changed args shows the static snippet **with a warning that it does not follow the args**. So Solid users who turn the flag on get warnings until we implement it. React does it in `code/renderers/react/src/docs/print-hole.ts`, `snippet-values.ts`, `componentManifest/generateCodeSnippet.ts` (`withTemplate: true` from `docgen/build-story-docs.ts`), and `entry-preview-docs.ts`. Vue 3, Svelte and Web Components ship the same feature at beta.3.

### React-side changes that are not ours to mirror (N/A)

- React builder docgen packages became optional peers (`builder-docgen.ts`, `react-vite` preset). We have no builder docgen.
- React docgen can run on the TypeScript 7.1 native API (`componentMeta/native/*`, `typescript.docgenSpecifier`). We bundle TS 6. Worth revisiting only when TS 7.1 is stable.
- `react/src/docs/lib/generateCode.ts` compact array/object spacing fix (`256bbfc771`) is for react-docgen default printing. We have no equivalent.

### MIGRATION.md entries relevant to us

- "Community packages that need a release" still lists `storybook-solidjs-vite`, with "No release with the fix is known yet". An upstream PR is needed once we publish.
- `@storybook/codemod` is no longer published. Codemods live in `storybook migrate`, and the `csf-factories` automigration still has that id.
- ESLint: `meta-inline-properties` was replaced by `static-csf-properties`. It errors on a `preview.meta()` whose preview factory is imported from a path that is not `.storybook/preview`. Our `template/cli` stories import `../../.storybook/preview`, which is fine.
- `storybook dev --no-open` was removed. Our example scripts do not use it (checked `examples/*/package.json`).
- The "CSF Next: …" sections keep their headings. The docs now say "CSF 4 (aka CSF Next)". See [CSF 4 and templates](./csf4-and-templates.md).

## Relevant files and modules (ours)

- `package.json`: needs `ts-dedent` in `devDependencies`. The `storybook` / `@storybook/builder-vite` ranges should move to `^11.0.0-beta.3` (bump together with `examples/*`). The peer floor `^11.0.0-beta.0` can stay: nothing we use is beta.3-only.
- `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/componentManifest/storyDocsProvider.test.ts`: import `ts-dedent`.
- `src/internal/componentManifest/docgen/storyDocsProvider.ts`, `src/internal/codeExamples/generateCodeSnippet.ts`: where a `template` would be produced for live snippets.
- `src/renderer/docs.ts`: where `parameters.docs.source.printHole` would be set (React sets it in `entry-preview-docs.ts`).
- `.briefback/docs/framework/react-parity.md`: snapshot is beta.0. Update the "Next Storybook update" list with `docs-tools/snippetTemplate.ts` and `services/story-docs/live-snippet.ts`.

## Constraints

- `ts-dedent` must be an explicit devDependency. Do not rely on Storybook transitive deps; beta.3 bundles most of them.
- A user's `~/.npmrc` `save-exact=true` made `bun add` write exact versions (`11.0.0-beta.3`, not `^…`) in the trial. Check ranges after bumping.
- The live snippets contract is `@experimental` and the flag is off by default. Template places are renderer-defined (`HolePlace` union shared by provider and `printHole`).

## Sources (retrieved 2026-11-17)

- Storybook repo, tags `v11.0.0-beta.0`..`v11.0.0-beta.3` (local clone `/tmp/sb-research/sb`, 903 commits). Diffs: `MIGRATION.md`, `code/core/src/{csf-tools,csf,component-meta,common,docs-tools,types,shared/open-service,core-server}`, `code/builders/builder-vite`, `code/renderers/react`.
- `CHANGELOG.prerelease.md` at `v11.0.0-beta.3` (beta.1–beta.3 entries).
- `code/lib/cli-storybook/src/sandbox-templates.ts` at `v11.0.0-beta.3` (`solid-vite/default-ts` skip comment).
- Trial logs in `/tmp/sb-research/logs/` (see [upgrade trial](./upgrade-trial.md)).

## Open questions

- Should we implement live snippets (`template` + `printHole`) now or wait for the flag to leave experimental? React, Vue, Svelte and WC all have it at beta.3.
- When do we send the upstream PR that removes us from MIGRATION.md "Community packages that need a release" and re-enables the sandbox's Chromatic task?

## Assumptions and limits

- Each changed file was not read line by line. Review was limited to the directories listed above plus commit subjects for React docgen paths.
- "Existence/shape" of imports is verified by `tsc` plus the unit tests. Runtime-only shapes outside test coverage were exercised only through the lab/solid1 builds, the `check-docgen` script and the lab Vitest run.
