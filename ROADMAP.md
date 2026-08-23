# Roadmap

Storybook 10.5 catch-up. Use `@storybook/react` as the reference — **modern surface only**.

## Done

- [x] **Vite `filter`** — `src/internal/componentManifest/solidComponentMetaPlugin.ts`  
  `transform` is a Vite object hook with `filter.id.include` / `exclude`.

- [x] **Skip ids with `?`** — same plugin  
  If `id` contains `?`, `return null`. `exclude` also matches `?`.

- [x] **`subcomponents` in the manifest** — `getComponents.ts`, `manifests.ts`  
  Reads `meta.subcomponents`. Resolves `Card.Header` even without JSX. Lab: `examples/lab/src/scenarios/subcomponents/`.

- [x] **`experimentalDocgenServer`** — same path as React; no `__docgenInfo` in preview when the flag is on  
  Preset hooks: `experimental_docgenProvider`, `experimental_storyDocsProvider` (`src/renderer/index.ts`).  
  - [x] docgen provider (props / argTypes / description / subcomponents)  
  - [x] story-docs provider (snippets — `getCodeSnippet` already exists)  
  - [x] flag on → do not register `solidComponentMetaPlugin`  
  - [x] ref-based manifests + shallow MDX — core writes `v: 1` `$ref` index + shallow MDX; we skip fat extract and only return `meta.docgen`  
  - [x] worker + recycle the TS program — worker hosts extract; manager drops LanguageServices at 70% of the V8 heap limit  
  RFC: https://github.com/storybookjs/storybook/discussions/35333

- [x] **tsconfig** — `findTsConfigForFile`  
  Walks up, then picks the config (including `references`) whose `fileNames` contain the file. Fallback: nearest tsconfig.

- [x] **CLI AI help** — `src/framework/preset.ts`  
  React/Vue don't export this; `experimental_storybookAi` is on addon-mcp.

- [x] **primitive `other`** — `src/renderer/docs.ts` / preview  
  Core 10.5 keeps primitive args for any `other` SBType. We don't emit `other`; `string | number` → object control is expected.

## Upstream docs (`storybookjs/storybook`)

Local fork only until PR lands. Document **supported** features only; don't claim test-runner, AI setup, or inline-stories table rows we haven't verified.

- [x] Draft in fork: `docs/get-started/frameworks/solid-vite.mdx`, install snippets, `frameworks.js` (Controls / interactions / Autodocs), Controls + Decorators + CSF Next Solid sections, `install.mdx` link
- [ ] **PR #1** — merge draft + MCP/manifests row for `storybook-solidjs-vite` + `experimentalDocgenServer` snippets
- [ ] **PR #2** — high-traffic `_snippets` (`main-config-typical`, `main-config-preview`, manifests, docgen-server) with `renderer="solid"`
- [ ] **storybook-web** — sync `get-frameworks.ts` + fix mocked snippets (`storybook-solidjs` → `storybook-solidjs-vite`)

## Testing & docgen gaps

Short status on items that block “full React parity” claims in README / upstream docs.

### `@storybook/addon-vitest`

- **README says:** integrated testing (Vitest).
- **Reality:** no `@storybook/addon-vitest` in `examples/lab`; no CI proof. Addon is Vite-first and has no Solid-specific blockers in core (unlike React's `react-dom/test-utils` / Vue's `__VUE_PROD_*` defines). Play functions + `storybook/test` should work; **reactive globals in browser tests** (`initialGlobals`) unverified.
- **To close:** wire addon in lab (`npx storybook add @storybook/addon-vitest`), one play story + one CSF Next `.test()` story, run in CI. Then add Solid to upstream `vitest-addon/index.mdx` supported list.
- **Effort:** ~0.5–1 day lab + CI, not renderer surgery.

### `experimentalTestSyntax` (CSF Next `.test()`)

- **Reality:** flag typed in `public-api.ts`; **no lab scenario**. React adds a decorator guard for `Tag.TEST_FN` — we don't, and probably don't need to (core CSF handles indexing). Likely works once Vitest addon lab exists.
- **To close:** `features.experimentalTestSyntax: true` in lab + one `meta.story().test()` scenario next to Vitest addon work.
- **Effort:** bundled with Vitest lab; ~1 story file.

### Inline stories (docs `Story` block)

- **Upstream table:** Solid column empty for “Inline stories”.
- **Reality:** we already set `parameters.docs.story.inline: true` in `src/renderer/docs.ts` (same as Preact/React). This is **not** the legacy `prepareForInline` React-bridge — modern SB renders in the framework preview. Preact is also empty in that table; likely **works but unverified**.
- **To close:** manual check in lab Autodocs (controls update inline canvas); if OK, ask upstream to add `solid` to `frameworks.js` inline-stories `supported` (optional, low priority).
- **Effort:** ~30 min verification, not a feature build.

### Record literal keys → enum (docgen)

- **Reality:** `Record<'a' | 'b', T>` props get **object** control, not radio/select. React RCM infers enum from Record index literal keys; we don't (`typeScenarioBaseline.test.ts` — “Record literal keys”). Gap is in `serializeType.ts` / TS checker: read index type literals from `Record` alias.
- **To close:** implement extraction + extend baseline test expectations; document as fixed in release notes.
- **Effort:** ~0.5–1 day focused docgen work; bounded, no Storybook core changes.

## Non-goals

| Area | Why skip |
|------|----------|
| Legacy test-runner (Puppeteer) | Vitest addon is the path |
| Portable stories / `composeStories` | Removed in SB 10.1 |
| Webpack builder | Vite-only by design |
| AI agentic setup (`docs/ai/setup`) | React + Vite hard block until SB opens renderer hooks |
| GraphQL addon | React/Angular niche, deprecated era |
