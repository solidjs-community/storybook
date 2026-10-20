# Handoff: sb11-estree-csf-tools

> Next chat: read this file. Do not re-port the PR and do not merge it until the gate below is open. Re-review Kasper's update against the findings here.
> Do not resurrect discarded approaches from a chat summary.

## Plan

path: none
sync: not used
scope: Draft PR [https://github.com/solidjs-community/storybook/pull/76](https://github.com/solidjs-community/storybook/pull/76) (`kasperpeulen/solidjs-storybook` `storybook-11-csf-tools`, head `d389d19` at review time, base `next` @ `8e414b8`, 9 commits ahead, 0 behind that base). It is already on current `next`, not an old branch. Do not port it again. Storybook 11 PR [https://github.com/storybookjs/storybook/pull/36613](https://github.com/storybookjs/storybook/pull/36613) (open, not in `11.0.0-alpha.7`) drops `storybook/internal/babel` and exposes ESTree on `CsfFile`. This preset still imports Babel in the five files below, so it will not load on that build. The PR moves those readers onto `storybook/internal/csf-tools` and builds snippets as source text edits instead of recast-printed Babel nodes. It imports Storybook's helpers (`createStoryArgsResolver`, `normalizeStoryDeclaration`, `resolveRenderFunction`, `staticKey`, `collectImportBindings`, `walk`, `metaObject`, `resolveIdentifierInit`, `storyShapeError`, `detachedTextOf`) instead of copying them. No new dependencies. Peer range stays `^11.0.0-0 || ^11.0.0`. CI lock is `storybook@11.0.0-alpha.6`, which still ships Babel, so the new named imports do not exist and the PR cannot pass CI until a prerelease contains #36613. Then raise the peer floor and move the lockfile. Local `next` has moved since the review (`0237509` merge of `main`, plus later commits); expect conflicts when the PR is updated.

Files: `.changeset/sb11-estree-csf-tools.md`, `src/internal/codeExamples/generateCodeSnippet.ts`, `src/internal/componentManifest/collectCsfArgNames.ts`, `src/internal/componentManifest/docgen/docgen-worker.ts`, `src/internal/componentManifest/docgen/storyDocsProvider.ts`, `src/internal/componentManifest/getComponents.ts`, `src/internal/componentManifest/subcomponents.ts`, `src/spec/codeExamples/generateCodeSnippet.test.ts`, `src/spec/componentManifest/subcomponents.test.ts`, `src/spec/helpers/storyScenario.ts`.

## This stage

Review of PR #76 written down
done when: the review survives this chat — met
shipped: `.briefback/sb11-estree-csf-tools/handoff.md`

Reviewed against helper source on storybookjs/storybook#36613 at `b558b85`. The port is sound enough to take once that prerelease exists. Merge order, render fallback, and the text edits match the helpers and the old Babel reader where the PR says they do. Story args overwrite the `args` property, so `Story.args = {…}` replaces the inline object rather than deep-merging. The last `render` wins. A story `render` that cannot be read does not fall back to the meta. `{...args}` and `args.foo` are rewritten in place, `Object.hasOwn` keeps `args.constructor` from being treated as an arg, and `readsArgs` walks parent-first so the object of `args.foo` is still a read. JSX depth still stores the wrapping count. Unsafe attribute and children strings become expressions.

### Defects

Fix these before merge. They do not make the approach wrong.

1. Snippets publish values that still name other locals or imports. `getCodeSnippet` keeps only `args` from `resolver.resolve()`. `createStoryArgsResolver` also returns `unresolved` and `imports`, because `resolveArgValue` follows a local only one binding deep. `const label = prefix + '!'` with `args: { label }` prints `label={prefix + '!'}`, and `prefix` is not in the snippet. An imported shorthand stays `label={importedLabel}` and the import is dropped. Story docs stores that string as the snippet. The old code printed `label={label}`, which was also unbound, but it did not invent a second name. The PR only describes the self-contained case (`const label = 'Hi'`). React's generator returns those two lists so the caller can refuse the snippet. If `unresolved.length > 0`, report the story docs error instead of a snippet that throws when copied.
2. `import X = require('./Button')` stays in the component list and still has no module. Scope analysis binds it as `kind: 'import'`, so `getComponents` keeps it (`binding.kind !== 'import'` is false, so it is not treated as local). `collectImportBindings` only walks `ImportDeclaration`. The ref is `{ componentName: 'Button' }` with no `importId` and no path. The old code dropped the name. The new code leaves a component docgen cannot open. The PR says it is no longer treated as local, and stops there. Either record `TSImportEqualsDeclaration` (`require('…')` and `NS.Y`) in the import map, or keep filtering these bindings until that exists.

### Follow-ups

Not merge blockers.

1. The assignment test does not lock replacement. `reads args through local constants, spreads and the last args assignment` only assigns `label` twice on a story with no inline args. Last-write-wins was already true of the old `{ ...inline, ...assigned }` merge. Add `export const A = { args: { size: 'lg' } }; A.args = { label: 'last' }` and expect `label` without `size`.
2. Any parameter that is not named `args` still dangles. After a rewrite, `readsArgs` keeps the whole parameter list only if the identifier `args` remains. `(args, context) => <Button {...args} theme={context.globals.theme} />` becomes `() => <Button theme={context.globals.theme} />`. Same class of bug the PR fixed for `args`. Keep every parameter the rewritten body still reads.
3. Manifest arg names still skip keys `staticKey` now accepts. `collectCsfArgNames` bails on every `computed` property and only records identifier and string keys. `{ ['label']: 1 }`, `{ [`label`]: 1 }`, and `{ 1: 'a' }` show up in snippets and in `meta.subcomponents`, and not in the manifest set. Call `staticKey` there too.
4. Multi-line children are indented from the wrong line. Injected attributes use the spread's line. Injected children use `printAt(opening.start)` while the text is inserted at `lastEnd`. On a split tag (`<Button\n  {...args}\n/>`) a multi-line `children` value is indented to the `<Button` line, not the line it lands on.

## Bleed

none

## Next stage

Re-review PR #76 after Kasper updates it
done when: head is not `d389d19`, both defects are fixed or explicitly declined, the four follow-ups are still checked, and the Storybook prerelease that contains #36613 is named before any merge or lockfile bump
suggested: Briefback review. Do not implement the port on local `next` until that prerelease exists.
