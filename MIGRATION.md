# Migration Guide

Upgrade paths for `storybook-solidjs-vite`:

| From | To   | Storybook    | Guide                              |
| ---- | ---- | ------------ | ---------------------------------- |
| 10.x | 11.x | Storybook 11 | [Version 10 → 11](#version-10--11) |
| 9.x  | 10.x | Storybook 10 | [Version 9 → 10](#version-9--10)   |

---

## Version 10 → 11

`storybook-solidjs-vite` **11.x** requires **Storybook 11**. Stay on **10.x** until you upgrade Storybook.

1. Upgrade `storybook` and `storybook-solidjs-vite` together.
2. Follow the [Storybook 11 migration guide](https://storybook.js.org/docs/releases/migration-guide) for core Storybook changes.
3. Do the Solid-specific steps below.

### Create `vite.config.ts` and add the Solid Vite plugin

Storybook 8+ already stopped injecting framework Vite plugins (same as React/Vue). This package used to add the Solid plugin for you, **11.x does not**.

If you do not have a root `vite.config.ts`, create one. You also need to add the Solid Vite plugin to your `vite.config.ts` file.

Solid 2 uses `@solidjs/vite-plugin`:

```typescript
import solid from "@solidjs/vite-plugin";

export default {
  plugins: [solid()],
};
```

Solid 1 stays on `vite-plugin-solid@^2`:

```typescript
import solid from "vite-plugin-solid";

export default {
  plugins: [solid()],
};
```

### Stories

[CSF Next](./README.md#csf-next) is the default in Storybook 11.
New `create-storybook --type=solid` apps use CSF Next as well.

Existing projects can still use CSF 3.

### Controls and Docs

No action. They still work by default.

To turn them off: `framework.options.docgen: false`.

### If you used `experimental-playwright`

That export is gone. Use `[@storybook/addon-vitest](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon)`.

---

## Version 9 → 10

### Storybook 10 core changes

Before migrating your `storybook-solidjs-vite` configuration, be aware of these critical Storybook 10 core changes:

#### Node.js

- **Node.js 20.19+ or 22.12+** is required for ESM support without flags.

#### ESM

- **`.storybook/main.`\* and `vite.config.ts` must be valid ESM** — `require`, `__dirname`, and `__filename` are not defined unless you add them:

  ```typescript
  import { createRequire } from "node:module";
  import { dirname } from "node:path";
  import { fileURLToPath } from "node:url";

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
import solid from "vite-plugin-solid";

export default {
  plugins: [solid()],
};
```

### Removed: `experimental-playwright`

Storybook **10.6** dropped the experimental Playwright component-testing bridge (`createPlaywrightTest`). Upgrade to `@storybook/addon-vitest` (or run Playwright against a running Storybook) instead of `storybook-solidjs-vite/experimental-playwright`.
