# React changes, Storybook v11.0.0-alpha.6 → v11.0.0-beta.0

Research only. Command: `git log --no-merges v11.0.0-alpha.6..v11.0.0-beta.0 -- code/renderers/react code/frameworks/react-vite` (76 commits), plus the core paths React depends on. Each commit is mapped to the PR that merged it into `next` (the closest `Merge pull request #N` on the ancestry path). Parity snapshot: [react-parity.md](./react-parity.md).

## Summary

- Of the 76 commits, 4 are version bumps and about 12 are test, format or docs-only. The rest fall into 18 PRs.
- **#36613 (oxc / ESTree csf-tools)** is the only change that is required for Solid at beta.0. It drops `storybook/internal/babel`. React's snippet generator and component resolution moved to the shared `csf-tools` helpers in the same PR. Our counterpart is draft PR #76 (see `.briefback/sb11-estree-csf-tools/handoff.md`). It is not merged, and its CI lock (alpha.6) predates the helpers.
- The other changes that apply to Solid are snippet correctness fixes. Most come along with #76: #36746, #36948, and the snippet fixes inside #36613. Two template changes also apply: #37082 adds JSDoc to the JS templates and #37082/#36875 settle TS7 handling.
- React-only or N/A:
  - act teardown (#36608).
  - React prebundle and alias (#36682, #36824, #36841, #36792).
  - React theming entry (#36841, #36913).
  - react-docgen / RDT builder paths (#36642, #36828, #36857).
  - TS-peer handling (#36987, #35834), because we bundle TS 6.

## Commit list by PR

Legend:
- Applies: yes / no / partial.
- Mirrored: ✓ we already have it · PR #76 covered by our draft port · ✗ missing · — N/A.

### #36613 csf-tools on oxc / ESTree, Babel removed (merged for alpha.7)

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| ebc35849cf | React builds manifests and snippets from ESTree nodes through shared `csf-tools` helpers instead of Babel/recast | yes, blocker | PR #76 (draft, blocked on prerelease and lock bump) |
| ee2478c36b | Print async render snippets; keep template-literal lines | yes | PR #76. Our current code keeps `fn.async` but prints via recast. |
| 003a0dd43e | Parenthesize comma expressions in snippets | yes | PR #76 |
| 209b3fb450 | String args JSX cannot hold (`&`, newlines, braces, `<`) print as `{"…"}` expressions | yes | ✗ today: `toAttr` emits raw `stringLiteral`. PR #76 per handoff. |
| 633887306f | Inline only the story's **own** args (`Object.hasOwn`); `args.constructor` no longer resolves to `Object` | yes | ✗ today: `key in merged` in `generateCodeSnippet.ts`. PR #76 per handoff. |
| b1be6201f9, a27a187244, 91b7cb4447, 5f12533999, 01a758c4cf | csf-tools refactors: paren spans, comment ownership, trimmed API, file name passed to the parser, code frame in story-shape errors | yes (API we consume) | PR #76 imports the resulting helpers. `storyShapeError` code frames only if we use it. |
| bc4cbe813b | `CsfFile.editor`, `.program`, `.appendStatement` are public; underscored names are deprecated aliases for SB 11 | yes | ✗. We use `_ast`, `_metaAnnotations`, `_storyDeclarationPath`, etc. (10 sites). PR #76 should prefer the public names. |

### #36948 kasper/csf-core-consumers

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 1e92719460 | Re-indent multi-line arg values to the line they land on (`detachedTextOf`) | yes | PR #76 partly. Handoff follow-up #4: children on a split tag are indented from the wrong line. |

### #36746 local / imported story references in snippets

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| c8b1aaab01 | Resolve local function story references (`export const A = renderFn`) | yes | ✗ / PR #76 if the helpers are used |
| 2301836152 | Local story aliases; fall back to `componentName` when the React component has no resolved name | yes | ✗ |
| 4cec247083, b6f3da28e0 | Imported bound story (`import { Template } …; export const A = Template.bind({})`) printed as `const A = () => Template.bind({})({…})` with its import recorded | yes | ✗. We only handle a local `.bind`. Needs `filePath` + `createStoryReferenceResolver()` in the resolver. |

### #36676 docs-tools: easier output for agents

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 003bf9a0db, 16803a8b0d, c011f90876, 73aded736c, 568359a2e5 | Mostly core `docs show` / `docs list` / suggest. React part: a component in a **private** app package (no entry-point fields) keeps the story's import instead of being imported by package name | partial | Core part: inherited. React part: ✓ by accident, because we never rewrite to package names. The other half (publishable packages imported by name) is ✗. |

### #36642 Carbon SB 11 fixes

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| fa00e065f3, 35bf9799b4 | Core: preview tags with spreads, package-local framework preset resolution (`safeResolveModule` from `configDir`). React: pick the manifest component correctly in `reactDocgen.ts` | Core part yes (inherited); React part no | — |
| 955541d7e7, 24b654a80a, baf15e26b8, d082c91cac | react-docgen engine: type-asserted `export default X as Y`, unique default vs named re-exports | no (builder docgen) | — Worth a scenario test that our TS LanguageService resolves `export default Button as ButtonComponent`. |

### #36608 act environment on teardown

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| a4849b6de8 | `await act(async () => unmount)` keeps `IS_REACT_ACT_ENVIRONMENT` set during teardown | no | — (no act in Solid) |

### #36682 prebundle `react/jsx-runtime`

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| bf510eb704, 0447c247ee | Add `react/jsx-runtime` to `optimizeViteDeps` so Vite does not reload when plugins import it late | maybe | ✗. No `optimizeViteDeps`. Solid's compiled JSX imports `@solidjs/web` / `solid-js/web`. Inferred: a first-run reload is possible but not observed. Open question. |

### #36824 move the React prebundle from addon-vitest to the renderer

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 18b1999123, 2b08d4c96d | `react` added to the renderer's `optimizeViteDeps`; the renderer preset list flows into the Vitest browser optimizer | pattern yes, cause no | — Cause is CJS React. Solid is ESM. The pattern (renderer `optimizeViteDeps` reaches Vitest browser mode) is available if needed. |

### #36841 / #36913 React theming entry → React alias from the renderer preset

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| ded64ac704, c1a4f7b0c5 | Added `@storybook/react/theming` and moved `withThemeFromJSXProvider` | no | — Later reverted inside the same PR (55f525258e). |
| 55f525258e, 627473b83d, a292f95776, 2041254ff3, b9119564b3, 3acd1eaee9 | Renderer `resolvedReact` + `viteFinal` dedupe plugin resolve React from the renderer package (pnpm global virtual store), anchored aliases | concept only | ✓ equivalent: our `viteFinal` `resolve.dedupe` for Solid packages and the renderer alias. |
| 69ecd64be1, c653eaaa7c | Emotion imports moved to `storybook/theming/internal` / `emotion` | no | — We do not import theming. |

### #36987 TypeScript as required peer, warn when unusable

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 0e350ba520 | `isTypeScriptReadyForDocgen` defaults `docgenServer`; workers use `loadTypeScriptCompilerApi`; warn once with the fix | no | — We bundle `@typescript/typescript6`, so the user's TS (including 7) does not matter. |
| 2ed5665e05 | `typescript` is a required peer for React, Vue, Svelte, WC | no | — Ours stays optional `*`. |
| e9c678704d | Test cases | — | — |

### #35834 guard against TypeScript builds without the compiler API

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 52685b7acd | Fail fast when `typescript` resolves to TS 7 with no compiler API | no | — Same reason. |

### #36875 accept TypeScript 7 in peer ranges

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 9cd47ff046 | Peer ranges include `^7.0.0` (create-vite 9.3 scaffolds TS 7) | yes | ✓ Our `typescript: "*"` is optional. |

### #36857 RDT JSDoc tags

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| fb495f39ac, d81a210c81 | Keep RDT JSDoc tags in the manifest; read tags from the TS export symbol through core `extractComponentJsDocInfo` | partial | — RDT is N/A. Core `extractComponentJsDocInfo` (from `storybook/internal/component-meta`) could replace our own JSDoc-tag reading. |

### #36828 parse each tsconfig once

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| bd1ee2a64b | Memoize `readTsconfig` in the RDT path | no | — Our `findTsConfigForFile` has its own caching. |

### #36792 ts-dedent floor

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| c0af6204f7 | `ts-dedent ^2.2.0` everywhere | no | — No `ts-dedent` dependency. |

### #37082 JS init templates use JSDoc

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| ce5400bb3e, 5f714e5448, d6e16de66a, 50f22d3f58 | JS `Button.jsx` / `Header.jsx` / `Page.jsx` templates get JSDoc `@param` types instead of `propTypes`, so server docgen reads types in JS projects | yes | ✗. Our `template/cli/js/*.jsx` have no JSDoc; `ts/Button.tsx` has no prop doc comments. |
| 1a670fab2b, f0c0fe916c | Drop the `null` default on `Header.user` | yes | ✓ (we never had it) |
| 135111a352, 4233a76e2d | Describe Header props; keep callbacks required | yes | ✗ descriptions; ✓ required callbacks |
| 84349e5c1d, f05183e665 | oxfmt print width | no | — |
| 87273582d8, 007f2a45b3, 6e645adf95 | Fixtures to JSDoc; server docgen reads props through `React.memo` | partial | — Solid has no `memo` wrapper. Nothing to mirror. |

### #36864, #36979 test infra

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| d882260f67, 1f4bd0b002 | Windows-only unit test fixes | no | — |
| 4ceca657b4 | Unit tests resolve workspace packages to source | no | — |

### #35812 custom tags autocompletion

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 0a1518280b, 48ab7eeba0 (+ core f285dba7c2) | `AddonTypes.tags: unknown`, so custom tags from addons or `.type<>()` pass through `meta.story` | yes (types) | ✓ probably, through `SolidTypes & T`. Untested. Add a type test. |

### #36706, #37086 docs and type-alias cleanup

| Commit | What | Applies | Mirrored |
|---|---|---|---|
| 5f2c01533f | Drop legacy `kind` / `story` from fixture contexts (core removed them from `RenderContext` / `StoryContext`) | yes (core) | ✓ We read `id` / `canvasElement.id` only. |
| bc4754339d | JSDoc `@see` links in public types | yes (cosmetic) | ✗ Our `StorybookConfig` JSDoc still links `docs/10/...`. |

### Version bumps (skipped)

6f8ff55457, f7d36c2300, 0798ec85fd, 290c374cef.

## Related core commits (same window, paths React depends on)

| Commit / PR | What | Applies to Solid | Status |
|---|---|---|---|
| 6f452818d6 | Core helpers moved off Babel onto csf-tools ESTree | yes | Part of the Babel removal. See PR #76. |
| e5e9611c65 (#36328) | `createMetaComponentResolver` accepts a declared node; `extractDeclaredSubcomponents` returns the component expression | yes | ✗ We keep our own Babel `subcomponents.ts`. Switching removes a Babel import. |
| 3633ad64fb, 766275a963 | Manifests render the full union for named-alias enums (RDT payloads) | no | — RDT-shaped data only. |
| da7ed8e55b | `core/story-docs` registered in the manager (when `docgenServer`) | yes | ✓ automatic; our provider feeds it. |
| 9077fa30c7 | Skip docgen and story-docs refresh when the index fails to build | yes | ✓ automatic |
| e5ae385d94, b141eff55b | `.extend()` keeps inherited tags; empty tags are ignored | yes | ✓ automatic (core `Story`) |
| 59b1674b53, 566ce343d0, 270b866bbf | Legacy `.story` annotations, deprecated aliases and v7/v8 flags removed | yes | Other agent's scope (core breaking changes). |
| 54ddb733cb, f7a2e92834 | init / automigrate offer to add `typescript` for docgen | partial | — Not needed for our docgen, but core may prompt Solid users anyway. Check during the trial upgrade. |

## Changes that predate alpha.6 but are still unmirrored

These matter for parity even though they fall outside the requested window:

- **CSF Next meta typing** (core and React `preview.tsx`, 2026-09-29 → 10-07): `MetaInput`, `MetaTypes`, `StoryArgs`, `TypedMetaArgKeys`, `PreviewAddonEntry`, `meta.type<>()`, required `addons`. ✗ for Solid. See react-parity.md gap #5.
- **Shared core component-meta base** (`storybook/internal/component-meta`, 2026-07-29): React's manager and project extend it. ✗ for Solid (our own copy).
- **`createStoryArgsResolver` / `unresolvedWarning` / `extractStoryJSDocInfo` / `createStoryReferenceResolver`** already exist at alpha.6. React's story docs use all four. We use none today. PR #76 adopts the resolver.

## Sources (read 2026-11-04)

- `git log` / `git show` on `/tmp/sb-research/sb` between tags `v11.0.0-alpha.6` (2026-10-12) and `v11.0.0-beta.0` (2026-11-03). PR numbers come from the first `Merge pull request #N` on each commit's ancestry path. The clone is partial, so a few `-S` pickaxe searches failed; those claims were checked by reading files at the tag instead.
- This repo `next` @ `aad4d49`: `src/internal/**`, `template/cli/**`, `.briefback/sb11-estree-csf-tools/handoff.md`.

## Assumptions and limits

- "Mirrored" was judged by reading our source, not by running tests.
- Where a fix is marked "PR #76", that relies on the handoff's description of PR #76 at head `d389d19`. The PR itself was not re-read for this page.
- Commits whose PR mapping fell on a branch-sync merge were attributed to the nearest real PR merge on the ancestry path. The groupings above match the commit subjects.
