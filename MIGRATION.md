# Migration Guide

Upgrade paths for `storybook-solidjs-vite`:

| From | To | Storybook | Guide |
| ---- | -- | --------- | ----- |
| 9.x | 10.x | Storybook 10 | [Version 9 → 10](#version-9--10) |
| 10.x | 11.x | Storybook 11 | [Version 10 → 11](#version-10--11) |

---

## Version 10 → 11

This major targets **Storybook 11**. Stay on `storybook-solidjs-vite` **10.x** until you upgrade Storybook itself.

For Storybook 11 core changes, follow the upstream guide when it ships.

### CSF Next in the CLI scaffold

**Before (10.x template):** CSF 3 (`export default meta`, `StoryObj`); `Page` used a `play` function.

**After (11.x template):** CSF Next (`preview.meta()`, `meta.story().test()`). Every scaffold story includes a test. A co-located `preview.ts` / `preview.js` in the stories folder calls `definePreview`.

The framework preset enables `features.experimentalTestSyntax` by default. Set `experimentalTestSyntax: false` in `main.ts` only if you need legacy CSF 3 without `.test()` support.

### Docgen server only

**Before (10.x):** RCM runs in the Vite preview via `__docgenInfo` injection; `experimental_enrichCsf` injects Autodocs snippets at index time.

**After (11.x):** Docgen runs **only on the Storybook server**:

- `experimental_docgenProvider` — Controls and component metadata
- `experimental_storyDocsProvider` — Autodocs snippets

Removed with no replacement in preview:

- Vite `__docgenInfo` plugin
- `experimental_enrichCsf` preset hook

The framework preset keeps `features.experimentalDocgenServer: true`. Do not set `experimentalDocgenServer: false` — there is no preview fallback.

`framework.options.docgen: false` still disables docgen entirely.

### Solid 2 default

**Before (10.x):** Solid **1** is the default renderer; Solid 2 uses the `solid-next` entry when detected.

**After (11.x):** Solid **2** is the default (`solid-next`). Projects on `solid-js` v1 still use `solid-legacy` automatically.

Solid 2 apps should use:

- `solid-js@^2`
- `@solidjs/web@^2`
- `vite-plugin-solid@^3`

### Vite: `vite-plugin-solid`

**Before (10.x):** The framework preset could inject `vite-plugin-solid` for you.

**After (11.x):** You must add it in `vite.config.ts` yourself (Storybook 8+ already stopped doing this for other frameworks):

```typescript
import solid from 'vite-plugin-solid';

export default {
    plugins: [solid()],
};
```

### Other breaking changes

- `storybook-solidjs-vite/experimental-playwright` export removed (use `@storybook/addon-vitest`).
- Portable-story (`__isPortableStory`) rendering paths removed from the renderer.

---

## Version 9 → 10

### Storybook 10 core changes

Before migrating your `storybook-solidjs-vite` configuration, be aware of these critical Storybook 10 core changes:

#### Node.js

- **Node.js 20.19+ or 22.12+** is required for ESM support without flags.

#### ESM

- **`.storybook/main.*` and `vite.config.ts` must be valid ESM** — `require`, `__dirname`, and `__filename` are not defined unless you add them:

    ```typescript
    import { createRequire } from 'node:module';
    import { dirname } from 'node:path';
    import { fileURLToPath } from 'node:url';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const require = createRequire(import.meta.url);
    ```

#### TypeScript

- Use a `moduleResolution` that supports the `types` condition:

    ```json
    {
        "compilerOptions": {
            "moduleResolution": "bundler"
        }
    }
    ```

    (`node16` / `nodenext` also work.)

#### Addon paths

- Local addons must be fully resolved — `"./my-addon.ts"` becomes `import.meta.resolve("./my-addon.ts")`.

For all Storybook 10 core changes, see the [official Storybook migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#from-version-9x-to-1000).

### Framework configuration

#### Docgen (RCM)

**Before (v9):** `typescript.reactDocgen` / `reactDocgenTypescriptOptions` (react-docgen-typescript).

**After (v10):** Solid **component-meta (RCM)** only — remove the `typescript` docgen block from `main.ts`.

```typescript
framework: {
    name: 'storybook-solidjs-vite',
    options: {
        // docgen is enabled by default
        docgen: false, // → disable docgen (Controls, Docs, manifest)
    },
},
```

In **10.x**, props are extracted via TypeScript LanguageService and exposed to Controls/Docs through the preview (`__docgenInfo` Vite inject). The components manifest debugger is on by default (`features.componentsManifest` from the framework preset) at `/manifests/components.html`.

#### Addon path resolution

**Before (v9):**

```typescript
addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
],
```

**After (v10):**

```typescript
import path from 'node:path';

const getAbsolutePath = (packageName: string): string =>
    path.dirname(import.meta.resolve(path.join(packageName, 'package.json'))).replace(/^file:\/\//, '');

addons: [
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
],
```

#### Removed configuration sections

- `typescript` docgen options (use `framework.options.docgen` instead)
- `viteFinal` in `main.ts` is optional — prefer `vite.config.ts` for app-level Vite plugins

#### Vite configuration

You can keep `viteFinal` in `main.ts`, but a root `vite.config.ts` is usually clearer:

```typescript
// vite.config.ts
import solid from 'vite-plugin-solid';

export default {
    plugins: [solid()],
};
```

### Removed: `experimental-playwright`

Storybook **10.6** dropped the experimental Playwright component-testing bridge (`createPlaywrightTest`). Upgrade to `@storybook/addon-vitest` (or run Playwright against a running Storybook) instead of `storybook-solidjs-vite/experimental-playwright`.
