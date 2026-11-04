# Migration Guide

Upgrade paths for `storybook-solidjs-vite`:

| From | To   | Storybook    | Guide                              |
| ---- | ---- | ------------ | ---------------------------------- |
| 10.x | 11.x | Storybook 11 | [Version 10 → 11](#version-10--11) |
| 9.x  | 10.x | Storybook 10 | [Version 9 → 10](#version-9--10)   |

---

## Version 10 → 11

`storybook-solidjs-vite` **11.x** requires **Storybook 11**, `11.0.0-beta.0` or later (peer `^11.0.0-beta.0 || ^11.0.0`). Earlier 11 prereleases still ship `storybook/internal/babel`, and the preset fails to load on them. Stay on **10.x** until you upgrade Storybook.

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

New `create-storybook --type=solid` apps use [CSF Next](./README.md#csf-next) stories. Existing projects can still use CSF 3.

`storybook automigrate csf-factories` writes `import { defineMain } from 'storybook-solidjs-vite/node'` in `.storybook/main.ts`. That subpath is new in 11.x; importing `defineMain` from the package root still works.

### CSF Next types

`SolidPreview`, `SolidMeta` and `SolidStory` now use Storybook 11's CSF Next types, the same way `@storybook/react` does. The [Storybook 11 CSF Next notes](https://storybook.js.org/docs/releases/migration-guide) apply to Solid as well.

**`addons` is required in `definePreview()`.** Pass `[]` if you have none. Addon preview namespaces (`import * as addon from 'some-addon/preview'`) are accepted next to `definePreviewAddon` addons.

```diff
-export default definePreview({});
+export default definePreview({ addons: [] });
```

**Meta args no longer need `as const`.** `preview.meta()` remembers which args you set and checks each value against the component's props. `meta.input.args` is typed as the component declares those props.

```diff
 const meta = preview.meta({
   component: Button,
-  args: { variant: "primary" as const },
+  args: { variant: "primary" },
 });
```

**Every key in meta args must be an arg.** That is a component prop, an arg of the meta's typed `render`, an arg read by one of its `decorators`, or an arg declared with `preview.type<{ args }>()`. This includes args passed as a variable or a spread. For union props, meta can only set props that every member has. Set the others in the story.

```diff
-const meta = preview.meta({
+const meta = preview.type<{ args: { theme: "light" | "dark" } }>().meta({
   component: Button,
   args: { label: "Hi", theme: "dark" },
 });
```

**Use `mocked()` for the mock API on args.** An arg set to `fn()` in meta is typed as the component declares it. Wrap it in `mocked()` from `storybook/test` to call mock methods. Assertions such as `expect(args.onClick).toHaveBeenCalled()` work without it.

```diff
-args.getUsers.mockResolvedValue(users);
+mocked(args.getUsers).mockResolvedValue(users);
```

**`meta.type<S>()` returns a `SolidMeta`.** It adds args to the stories made from that meta only, and keeps `story.Component`.

**Type parameters changed.** The second type argument of `SolidMeta` is now the union of arg names set in meta, not the meta input type. `DefinePreviewInput` takes `PreviewAddonEntry[]`. If you wrote these types by hand, use `ReturnType<typeof preview.meta>` or let TypeScript infer them.

### Controls and Docs

No action. They still work by default, now from the Storybook server instead of a Vite `__docgenInfo` inject.

To turn them off: `framework.options.docgen: false`. That also turns off **Show code** snippets.

`features.experimentalCodeExamples: false` still turns snippets off; story descriptions stay.

`.test()` stories throw when `features.experimentalTestSyntax` is `false`, as in `@storybook/react`. The flag is on by default, so this only matters if you turned it off.

### If you used `experimental-playwright`

That export is gone. Use [`@storybook/addon-vitest`](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), or [portable stories](./README.md#portable-stories) (`composeStories`) in plain Vitest.

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
