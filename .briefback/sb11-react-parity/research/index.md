# SB 11 compatibility and React parity

## Question and scope

Is `storybook-solidjs-vite` (branch `next`, locked to `storybook@11.0.0-alpha.6`) fully compatible with Storybook `11.0.0-beta.0` (feature freeze, 2026-11-03), and where does it fall short of `@storybook/react` + `@storybook/react-vite` at that tag? Covers core changes alpha.6 → beta.0, the 10 → 11 MIGRATION.md, a trial upgrade, React feature parity, and React commits in the same window.

Snapshot: 2026-11-04. Storybook clone at `v11.0.0-beta.0`: `/tmp/sb-research/sb`.

## Summary

- **One hard break: Babel is gone.** `storybook/internal/babel` was removed in alpha.7/alpha.8 (#36613). `csf-tools` is now ESTree and dropped `_ast`, `_file`, `_storyPaths` and `_storyDeclarationPath`. `extractDescription` now takes `(node, editor)`. Six source files and two specs import Babel. On alpha.8:
  - typecheck fails with 47 errors;
  - tests do not start, because `globalSetup` imports Babel;
  - the build exits 0 but `dist` still imports Babel;
  - the lab build exits 0 and silently drops our preset.

  Every other `storybook/internal/*` API we use is unchanged through beta.0.
- **PR #76 is the port.** Head is `9066a74`, CI is green on a canary that is an ancestor of beta.0, and all the helpers it imports exist at beta.0. The two review defects are still open: unresolved snippet values, and `import X = require()` component refs.
- **beta.0 was not installed.** `~/.bunfig.toml` sets `minimumReleaseAge` to 3 days, so beta.0 is blocked until about 2026-11-06T18:49Z. The trial ran on alpha.8 instead. The beta.0 results are inferred from diffs.
- **React parity.** The canvas runtime, the preset and server docgen are at parity or differ on purpose. Gaps:
  - the `create-storybook --type=solid` scaffold is likely broken (CSF Next templates against a CSF 3 `preview` written by the CLI);
  - CSF Next types still use the 10.x shape (no `MetaInput`/`StoryArgs`/`meta.type<>()`, and `@ts-expect-error` on `SolidMeta`);
  - no portable stories and no `./node` subpath;
  - `internal_getArgTypesData` mangles absolute paths;
  - thinner story-docs and docgen payloads;
  - `experimentalCodeExamples` does nothing;
  - JS/TS templates have no JSDoc prop docs.
- **MIGRATION.md names `storybook-solidjs-vite`** as a community package that needs an SB 11 release.

## Topic pages

- [sb11-core-changes.md](./sb11-core-changes.md): framework-relevant core changes alpha.6 → beta.0 and the 10 → 11 migration notes.
- [upgrade-breakage.md](./upgrade-breakage.md): trial upgrade results on alpha.8, the fix list, and PR #76 status.
- [react-parity.md](./react-parity.md): parity table by area and a prioritized gap list with sizes.
- [react-changes-alpha6-beta0.md](./react-changes-alpha6-beta0.md): React commits in the window, by PR, and whether we mirror them.

## Important files

- Babel importers:
  - `src/internal/codeExamples/generateCodeSnippet.ts`
  - `src/internal/componentManifest/{collectCsfArgNames,getComponents,subcomponents}.ts`
  - `src/internal/componentManifest/docgen/{storyDocsProvider,docgen-worker}.ts`
  - specs: `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/helpers/storyScenario.ts`
- `src/preview/define-preview.ts`, `src/preview/public-api.ts`: CSF Next types.
- `src/framework/preset.ts`: features and `internal_getArgTypesData`.
- `template/cli/**`: create-storybook templates.
- `package.json`: peer range `storybook ^11.0.0-0`, exports (no `./node`).
- Upstream: `code/renderers/react/src/{preset.ts,preview.tsx,portable-stories.tsx,componentManifest/*}` and `code/lib/create-storybook/src/generators/{SOLID/index.ts,configure.ts}`.

## Open questions

- Override the release-age gate for Storybook packages, or develop on alpha.8/alpha.9 until beta.0 clears it?
- Take PR #76 as-is plus fixes on our side, or wait for the author?
- Template direction: keep CSF Next (we own `.storybook/preview` or need an upstream change) or switch to CSF 3 like React.
- Does PR #76 pass `filePath` + `createStoryReferenceResolver()` so imported-story snippets (#36746) work?
- Where React gets `experimentalTestSyntax` on by default at beta.0. Our forced `true` stays correct either way.

## Assumptions and limits

- Nothing ran on beta.0 itself. `examples/solid1` was not trialled. No browser check of the lab.
- The scaffold breakage and `getArgTypesData` returning `null` under addon-vitest are inferred from code, not run.
- Manager/UI-only core changes were judged irrelevant and skipped.
