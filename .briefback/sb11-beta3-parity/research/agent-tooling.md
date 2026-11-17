# Agent tooling: skills, `storybook tools`, MCP, and Solid

## Summary

- **`storybook tools` already works for Solid with no dev server** (observed in `examples/lab`, beta.3). `tools docs list`, `docs show --id`, `docs show-story`, `stories find-by-component` and `test run` all return correct Solid data. The local host loads our preset in-process and calls the open services, which run our `experimental_docgenProvider` worker and `experimental_storyDocsProvider`. Nothing Solid-specific is missing on the data path.
- **The skill content is framework-agnostic.** The `storybookjs/skills` repo (tag `v11.0.0-beta.3`) has thin `SKILL.md` files that run `npx storybook skills <id>`. `npx storybook skills write-stories` / `component-docs` print correct Solid guidance in the lab (it detects `definePreview` in `.storybook/preview.tsx` and tells agents to use CSF Factories).
- **Solid is excluded by hard-coded allowlists in core**, not by missing data:
  - `supportsSkills(renderer, framework)` (`code/core/src/cli/installSkills.ts`) allows only the React, Svelte and Web Components renderers plus the `vue3-vite` and `angular-vite` frameworks. So `storybook init` never offers the "ai" feature for Solid, and the `skills` automigration (run by `storybook upgrade` or `npx storybook automigrate skills`) is "not applicable" (observed on a Solid scaffold).
  - `supportsAiSetup` and `SUPPORTED_SETUP_RENDERERS` (`code/core/src/cli/skills/setup-support.ts`) cover React, Vue 3 and Angular on Vite only. `npx storybook skills setup` prints "AI-assisted setup is currently only available for React, Angular, and Vue projects using the Vite builder. Detected renderer: storybook-solidjs-vite …" (observed).
  - `frameworkToRendererMap` (`skills/content/framework-renderer.ts`) has no Solid entry. It only feeds `isReactProject` (`.tsx` vs `.ts` in setup prompts), so it is cosmetic.
  - The docs page "Connect to AI agents" lists supported frameworks (React, Vue 3, Angular, Svelte, Web Components) and says MCP "supports the same renderers". Solid and community frameworks are not mentioned. Blog: "Agent-ready docgen for all core frameworks".
- **Workaround today:** users can install the skills by hand with `npx skills@latest add storybookjs/skills#v11.0.0-beta.3 --yes --agent claude-code universal --copy` (the command `installSkills` runs), or through the Claude Code / Codex plugins. They then paste the `AGENTS.md` section from MIGRATION.md "`stories` skill split into four skills".
- **Must-do (upstream PR):** add `renderer === SupportedRenderer.SOLID` (or `framework === SupportedFramework.SOLID`) to `supportsSkills`, and add Solid to the AI docs table. Our preset already meets every runtime gate. `setup` (AI-assisted setup) is a separate, larger ask; Svelte and WC do not have it either.

## How it works

### `storybook tools` (code: `code/core/src/cli/tools/*`, SDK `storybook/internal/tools`)

- The default mode is `auto`: attach to a running instance if one is found, otherwise **local**. Local loads the project config in-process (`bootstrapToolsRuntime`). Methods marked `requiresDevServer` (`stories preview`, `review create`) fail locally. Everything else runs headless.
- `docs` toolset data path: `toolsets/docs/access-local.ts` `createLocalDocsAccess()` uses the **open services** (`docgen` + `story-docs`) when both are registered, else the inline manifests. Core registers those services when `features.docgenServer` is on and the preset supplies `experimental_docgenProvider`. Our preset turns `docgenServer` and `componentsManifest` on by default and supplies both providers (`src/renderer/index.ts`).
- Gates (`code/core/src/cli/skills/availability.ts`, `manifest-status.ts`): `docsEnabledForCli = hasManifests`, which is true in docgen-server mode (`features.docgenServer && features.componentsManifest`). MCP `docsEnabled` also needs the `componentsManifest` flag, which we default on. `testSupported` = `@storybook/addon-vitest` enabled. `moduleGraphSupported` = builder-vite change detection (we use builder-vite).
- Props rendering: `toolsets/docs/manifest-formatter/markdown.ts` `getParsedDocgen()` reads `reactDocgen` → `reactDocgenTypescript` → **`reactComponentMeta`**. Our docgen payload sets `reactComponentMeta` (raw `SolidComponentDoc`), so `docs show` prints a `## Props` type block. Keep that field name. It is the only props source the formatter reads besides react-docgen.
- Observed formatter quirk (core, not Solid-specific): prop names that are not identifiers print unquoted, e.g. `aria-label?: string;` in `docs show --id docgen-all-types`.

### Skills (code: `code/core/src/cli/skills/*`, content repo `storybookjs/skills`)

- `SKILL_IDS` (`skills/content/skills.ts`): `component-docs`, `write-stories`, `test-stories`, `ui-review`, `setup`. The repo also ships `storybook-init`, `storybook-setup` and `storybook-upgrade` skills.
- Content is built per project from `skills/inputs.ts`: framework package name, `csfFactories` (= `isCsfFactoryPreview(readConfig(preview))`), availability. No renderer-specific branches except `isReactProject` in setup prompts.
- Install: `installSkills()` runs `skills@latest add storybookjs/skills#v<storybook version> --yes --agent claude-code universal --copy` and edits `AGENTS.md`/`CLAUDE.md` between `<!-- BEGIN:storybook-skills -->` markers (`agentInstructions.ts`). Callers: `create-storybook/src/initiate.ts` (`isAiAvailable: supportsSkills(renderer, framework)`) and `cli-storybook/src/automigrate/fixes/skills.ts`. `check()` returns `null` unless `supportsSkills` is true, so even an explicitly requested `automigrate skills` refuses Solid. `supportsSkills` is unchanged between beta.0 and beta.3.

### MCP

- MCP lives in `@storybook/addon-mcp` (not inspected). It uses the same `getToolAvailability()` gates and the same docs access as `storybook tools`, and needs a running dev server. Nothing in core's gating is renderer-specific, so with `@storybook/addon-mcp` added, Solid should get the docs toolset. This is inferred, not run.

## What a community framework must provide for headless `tools docs`

What our preset already provides, each confirmed by the observed headless run:

1. A renderer preset with `experimental_docgenProvider` (worker descriptor, `./internal/docgen-worker`) and `experimental_storyDocsProvider`.
2. `features.docgenServer: true` (or `isDocgenProviderEnabled` returning true) and `features.componentsManifest: true` by default.
3. A docgen payload with `id` / `name` / `path` / `description` / `summary` / `jsDocTags` / `reactComponentMeta` / `subcomponents`, and story docs with `snippet` / `description` / `summary` / `import`.
4. `internal_getArgTypesData` for story-creation tooling (not exercised by `tools`).
5. `@storybook/addon-vitest` for `tools test run`, and builder-vite for `stories find-by-component` / `stories changed`.

Nothing else is required. No framework registry entry is consulted on the `tools` path. The only allowlists sit on the **install/offer** path (init, upgrade automigration, AI setup) and in the docs.

## Relevant files and modules

- `code/core/src/cli/installSkills.ts`: `supportsSkills`, `supportsAiSetup`, `installSkills`. **This is the upstream PR target.**
- `code/core/src/cli/skills/setup-support.ts`: `SUPPORTED_SETUP_RENDERERS`.
- `code/core/src/cli/skills/content/framework-renderer.ts`: `frameworkToRendererMap` (no Solid; cosmetic).
- `code/lib/cli-storybook/src/automigrate/fixes/skills.ts`: the `skills` automigration.
- `code/lib/create-storybook/src/initiate.ts`: `isAiAvailable`.
- `code/core/src/cli/skills/availability.ts`, `manifest-status.ts`: tool gates.
- `code/core/src/shared/open-service/toolsets/docs/{access-local.ts,manifest-formatter/markdown.ts}`: docs data path and props formatting.
- `docs/ai/*` (upstream docs): supported-framework table.
- Ours: `src/renderer/index.ts`, `src/framework/preset.ts` (features), `src/internal/componentManifest/docgen/{docgen-worker.ts,storyDocsProvider.ts}`.

## Constraints

- Keep `reactComponentMeta` as the payload field for props. Renaming it would blank the `## Props` section in `tools docs show`.
- `framework.options.docgen: false` turns off `docgenServer`. `tools docs` then falls back to the manifests, and our `experimental_manifests` returns an empty `components` map in that mode. Inferred: docs tools would show nothing. Not run.
- The skills install pins the content repo to `#v<storybook version>`.

## Sources (retrieved 2026-11-17)

- Storybook `v11.0.0-beta.3` source (paths above); `MIGRATION.md` "`storybook ai` command removed", "`stories` skill split into four skills".
- https://storybook.js.org/docs/11/ai/connect (supported frameworks table; no Solid).
- https://storybook.js.org/blog/storybook-11-beta/ ("Agent-ready docgen for all core frameworks").
- `gh api repos/storybookjs/skills` tree at `v11.0.0-beta.3`, `skills/write-stories/SKILL.md`.
- Observed runs: `/tmp/sb-research/logs/30`–`37-*.log` (lab) and the `automigrate skills` run on `/tmp/sb-research/scaffold` (see [upgrade trial](./upgrade-trial.md)).

## Open questions

- Is upstream willing to add Solid to `supportsSkills` now? It is the comment's own criterion ("frameworks that have … a docgen server"), which we meet.
- Does `@storybook/addon-mcp` at the matching version add any renderer allowlist of its own? Not inspected.
- Should we document the manual skills install in our README until upstream ships the change?

## Assumptions and limits

- MCP was not run, and `@storybook/addon-mcp` source was not read.
- `review create` and `stories preview` need a running dev server and were not tried.
- The skills install was not run manually (it writes to the project and fetches from GitHub).
