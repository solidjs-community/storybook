# Migration Guide: Version 9 to 10

## Important Core Changes

Before migrating your `storybook-solidjs-vite` configuration, be aware of these critical Storybook 10 core changes:

### Node.js Requirements

- **Node.js 20.19+ or 22.12+** is now required
- Storybook 10 requires these versions for ESM support without flags

### ESM Requirements

- **`.storybook/main.*` and `vite.config.ts` files must be valid ESM** - CJS constants (`require`, `__dirname`, `__filename`) are no longer defined
- If you need CJS constants, define them manually:

  ```typescript
  import { createRequire } from "node:module";
  import { dirname } from "node:path";
  import { fileURLToPath } from "node:url";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const require = createRequire(import.meta.url);
  ```

### TypeScript Configuration

- **Update `tsconfig.json`** to use a `moduleResolution` that supports the `types` condition:
  ```json
  {
    "compilerOptions": {
      "moduleResolution": "bundler" // or "node16"/"nodenext"
    }
  }
  ```

### Addon Path Resolution

- **Local addons must be fully resolved** - relative paths like `"./my-addon.ts"` must become `import.meta.resolve("./my-addon.ts")`

For complete details on all Storybook 10 changes, see the [official Storybook migration guide](https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#from-version-9x-to-1000).

---

## Configuration Changes

### .storybook/main.ts Configuration

The main configuration file has several important changes:

#### 1. Docgen configuration

**Before (v9):**

```typescript
framework: 'storybook-solidjs-vite',
typescript: {
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
        shouldExtractLiteralValuesFromEnum: true,
        propFilter: (prop: any) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
},
```

**After (v10):**

```typescript
framework: {
    name: 'storybook-solidjs-vite',
    options: {
        docgen: false // → docgen disabled
        // docgen: true // docgen enabled
        // docgen: undefined (default) // docgen enabled with default settings
        // docgen: { tsconfig: '...', ... } // docgen enabled with custom options (see https://github.com/styleguidist/react-docgen-typescript#options for more details)
    },
},
```

#### 2. Addon Path Resolution

To ensure that addons are correctly resolved, you need to use the `getAbsolutePath` helper function.

**Before (v9):**

```typescript
addons: [
    '@storybook/addon-onboarding',
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-links',
    {
        name: '@storybook/addon-vitest',
        options: {
            cli: false,
        },
    },
],
```

**After (v10):**

```typescript
// Add this helper function at the top
const getAbsolutePath = (packageName: string): string =>
    path.dirname(import.meta.resolve(path.join(packageName, 'package.json'))).replace(/^file:\/\//, '');

addons: [
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-docs'),
    getAbsolutePath('@storybook/addon-a11y'),
    getAbsolutePath('@storybook/addon-links'),
    {
        name: getAbsolutePath('@storybook/addon-vitest'),
        options: {
            cli: false,
        },
    },
],
```

#### 3. Removed Configuration Sections

**Removed from v10:**

- `typescript` docgen configuration section (moved to framework options)
- `viteFinal` function (moved to vite.config.ts)

#### 4. Vite configuration

**Before (v9):**

```typescript
viteFinal: async (config) => {
    return mergeConfig(config, {
        plugins: [
            ...
        ]
    });
},
```

**After (v10):**
You still can use the `viteFinal` function if you want, but I do recommend using `vite.config.ts` instead.

```typescript
// vite.config.ts
export default {
    plugins: [
        ...
    ]
};
```
