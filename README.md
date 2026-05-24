# Storybook for SolidJS

[![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white)](https://storybook.js.org)
[![SolidJS](https://img.shields.io/badge/SolidJS-2C4F7C?style=flat-square&logo=solid&logoColor=white)](https://solidjs.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

[![npm version](https://img.shields.io/npm/v/storybook-solidjs-vite?style=flat-square)](https://www.npmjs.com/package/storybook-solidjs-vite)
[![npm downloads](https://img.shields.io/npm/dw/storybook-solidjs-vite?style=flat-square)](https://www.npmjs.com/package/storybook-solidjs-vite)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/solidjs-community/storybook/pulls)

[Storybook](https://storybook.js.org/) **framework adapter** for [SolidJS](https://solidjs.com/), using Vite.

Adds SolidJS support to Storybook.

## ✨ Features

- Solid 1 and Solid 2 support
- Vite-powered builder
- TypeScript-first setup
- ArgTypes generation from TypeScript
- [CSF Next](https://storybook.js.org/docs/api/csf/csf-next) factory API (optional)
- Compatible with Storybook addons
- Integrated testing (Vitest, Playwright)

## 🚀 Getting Started

Run in your project:

```bash
npx create-storybook --type=solid
```

Then start Storybook:

```bash
bun run storybook
```

Open the URL shown in the terminal.

## ⚙️ Configuration

You can customize Vite and Storybook as usual.

- Add stories in `src/**/*.stories.tsx` or `src/**/*.stories.js`
- Use Storybook addons for additional functionality

### Solid 1

On Solid 1, import from `storybook-solidjs-vite` in config, preview, and stories:

```ts
// .storybook/main.ts
import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  framework: 'storybook-solidjs-vite',
};

export default config;
```

```ts
// .storybook/preview.tsx & stories
import type { Preview, Meta, StoryObj } from 'storybook-solidjs-vite';
```

### Solid 2

On Solid 2, use `storybook-solidjs-vite/next` in preview and stories — the types there match the Solid 2 renderer:

```ts
import type { Preview, Meta, StoryObj } from 'storybook-solidjs-vite/next';
```

Imports without `/next` often still run, but TypeScript may complain because those types describe the Solid 1 renderer.

In `main.ts` either framework name is fine: `storybook-solidjs-vite` reads the major version from your installed `solid-js`, and `storybook-solidjs-vite/next` forces Solid 2.

```ts
framework: 'storybook-solidjs-vite'
framework: 'storybook-solidjs-vite/next'
```

### CSF Next

[CSF Next](https://storybook.js.org/docs/api/csf/csf-next) works on Solid 1 and Solid 2.

```ts
// .storybook/main.ts
import { defineMain } from 'storybook-solidjs-vite/node';

export default defineMain({
  framework: { name: 'storybook-solidjs-vite' },
});
```

```ts
// .storybook/preview.tsx
import { definePreview } from 'storybook-solidjs-vite';
// for Solid 2, use:
// import { definePreview } from 'storybook-solidjs-vite/next';
```

```ts
// src/Button.stories.ts
import preview from '../.storybook/preview';
import { Button } from './Button';

const meta = preview.meta({
  component: Button,
});

export const Primary = meta.story({
  args: { label: 'Button' },
});
```

### TypeScript docgen

TypeScript props for docs and controls are generated with [@joshwooding/vite-plugin-react-docgen-typescript](https://github.com/joshwooding/vite-plugin-react-docgen-typescript).

Configure it with framework.options.docgen in .storybook/main.ts.

`false` — disable docgen
`true` (default) — enable docgen with the default configuration
`object` — override default configuration

```ts
import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  framework: {
    name: 'storybook-solidjs-vite',
    options: {
      docgen: {
        savePropValueAsString: true,
        shouldExtractLiteralValuesFromEnum: true,
        propFilter: (prop: any) =>
          prop.parent ? !/node_modules/.test(prop.parent.fileName) : true,
      },
    },
  },
};

export default config;
```

## 🎨 Decorators

On args or globals changes, Storybook re-runs decorators and stories — the same model as React, where each update calls your functions again. Solid updates through fine-grained signals and usually does not need that.

If a decorator returns JSX, the extra runs can leave duplicate nodes in the DOM.

### createJSXDecorator

Use for decorators that return JSX. Ensures they run only once per story mount.

```tsx
import { createJSXDecorator } from 'storybook-solidjs-vite';

export const decorator = createJSXDecorator((Story) => {
  return (
    <main>
      <Story />
    </main>
  );
});
```

### createDecorator

Use for decorators that do not return JSX.

```tsx
import { createDecorator } from 'storybook-solidjs-vite';

export const decorator = createDecorator((Story) => {
  return Story();
});
```

### Manual flag

```tsx
import { IS_SOLID_JSX_FLAG } from 'storybook-solidjs-vite';

export const decorator = (Story) => {
  return <div><Story /></div>;
};

decorator[IS_SOLID_JSX_FLAG] = true;
```

## 🔄 Migration from v9

Check out [Migration Guide](./MIGRATION.md) for the instructions and breaking changes.

## 🤝 Contributing

Contributions, issues and feature requests are welcome! Feel free to [open an issue](https://github.com/solidjs-community/storybook/issues) or submit a PR.

## 📖 License

MIT

## 👤 Maintainer

<img src="https://github.com/kachurun.png" width="100" height="100" alt="@kachurun's avatar" style="border-radius: 50%;">

Maintained with ❤️ by [@kachurun](https://github.com/kachurun)
