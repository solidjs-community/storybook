# Storybook for SolidJS

[![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white)](https://storybook.js.org)
[![SolidJS](https://img.shields.io/badge/SolidJS-2C4F7C?style=flat-square&logo=solid&logoColor=white)](https://solidjs.com)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)

[![npm version](https://img.shields.io/npm/v/storybook-solidjs-vite?style=flat-square)](https://www.npmjs.com/package/storybook-solidjs-vite)
[![npm downloads](https://img.shields.io/npm/dw/storybook-solidjs-vite?style=flat-square)](https://www.npmjs.com/package/storybook-solidjs-vite)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/solidjs-community/storybook/pulls)

[Storybook](https://storybook.js.org/) framework adapter for [SolidJS](https://solidjs.com/) on Vite.

## ✨ Features

- SolidJS and SolidJS 2 support
- [Vite-powered builder](https://storybook.js.org/docs/builders/vite)
- [TypeScript-first setup](https://storybook.js.org/docs/configure/integration/typescript)
- Automatic props in [Controls and Docs](#docgen)
- [Autodocs code snippets](#autodocs-code-snippets) — static JSX **Show code** blocks from story source (enabled by default)
- [Components manifest](https://storybook.js.org/docs/ai/manifests) for AI agents ([debugger](#components-manifest-debugger))
- [Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview) support ([setup](#storybook-mcp))
- [CSF Next](https://storybook.js.org/docs/api/csf/csf-next) support ([setup](#csf-next))
- [Integrated testing](https://storybook.js.org/docs/writing-tests) (Vitest, Playwright)
- [Compatible with Storybook addons](https://storybook.js.org/docs/addons)

## 🚀 Getting Started

Run in your project:

```bash
npx create-storybook --type=solid
npm run storybook
```

Open the URL shown in the terminal.

## ⚙️ Configuration

Customize Vite and Storybook as usual. Add stories in `src/**/*.stories.{tsx,js}` and install addons
as needed.

### CSF Next

```ts
// .storybook/main.ts
import { defineMain } from 'storybook-solidjs-vite';

export default defineMain({
  framework: { name: 'storybook-solidjs-vite' },
});
```

```ts
// .storybook/preview.tsx
import addonDocs from '@storybook/addon-docs';
import { definePreview } from 'storybook-solidjs-vite';

export default definePreview({
  addons: [addonDocs()],
});
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

### CSF 3

```ts
// .storybook/main.ts
import type { StorybookConfig } from 'storybook-solidjs-vite';

export default {
  framework: 'storybook-solidjs-vite',
} satisfies StorybookConfig;
```

```ts
// src/Button.stories.ts
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from './Button';

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: 'Button' },
};
```

### Docgen

Props for **Controls**, **Docs**, and the **components manifest** come from a TypeScript LanguageService extractor aligned with Storybook's `react-component-meta` format.

Enabled by default. Inspect output in the [manifest debugger](#components-manifest-debugger).

To disable:

```ts
import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  framework: {
    name: 'storybook-solidjs-vite',
    options: { docgen: false },
  },
};

export default config;
```

### Autodocs code snippets

**Show code** blocks are static snippets generated from story source at index time (`experimentalCodeExamples`). Enabled by default.

To disable:

```ts
import type { StorybookConfig } from 'storybook-solidjs-vite';

const config: StorybookConfig = {
  features: {
    experimentalCodeExamples: false
  },
};

export default config;
```

### Storybook MCP

Solid projects can use [Storybook MCP](https://storybook.js.org/docs/ai/mcp/overview) so AI agents can list components, read prop docs from component meta, and preview stories. Requires docgen (enabled by default) and `@storybook/addon-docs`.

```bash
npx storybook add @storybook/addon-mcp
```

See [Storybook MCP docs](https://storybook.js.org/docs/ai/mcp/overview#2-add-the-mcp-server-to-your-agent) for agent setup.

### Components manifest debugger

Storybook builds [JSON manifests](https://storybook.js.org/docs/ai/manifests) from CSF stories and component source — names, props, JSDoc, story ids, and more. Enabled by default (`features.componentsManifest`). Prop data comes from [docgen](#docgen); story snippets use the same [code generator](#autodocs-code-snippets).

While Storybook runs (or in a static build):

- **Debugger UI:** `http://localhost:6006/manifests/components.html` — browse manifests and generation errors/warnings
- **Components JSON:** `http://localhost:6006/manifests/components.json`
- **Docs JSON:** `http://localhost:6006/manifests/docs.json` (when MDX docs are present)

## 🎨 Decorators

On args or globals changes, Storybook re-runs decorators and stories functions follows React reactivity model. Solid updates via fine-grained signals and usually doesn't need that. JSX decorators re-run can leave duplicate DOM nodes. To avoid this, use `createJSXDecorator` function to define decorators that return JSX.

### createJSXDecorator

For decorators that return JSX. Runs once per story mount — `context.globals` and `context.args` are reactive stores, so bindings in JSX still update without re-running the decorator:

```tsx
import { createJSXDecorator } from 'storybook-solidjs-vite';

export const withLayout = createJSXDecorator((Story, context) => (
  <main data-theme={context.globals.theme}>
    <Story />
  </main>
));
```

### createDecorator

For side effects that should run on every story update — e.g. sync `document.body` when globals change:

```tsx
import { createDecorator } from 'storybook-solidjs-vite';

export const withTheme = createDecorator((Story, context) => {
  // Will run on every story update
  document.body.setAttribute('data-theme', context.globals.theme);
  return Story();
});
```

## 🔄 Migration from v9

See [Migration Guide](./MIGRATION.md) for breaking changes.

## 🤝 Contributing

Issues and PRs welcome — [open an issue](https://github.com/solidjs-community/storybook/issues) or submit a pull request.

## 📖 License

MIT

## 👤 Maintainer

<img src="https://github.com/kachurun.png" width="100" height="100" alt="@kachurun's avatar" style="border-radius: 50%;">

Maintained with ❤️ by [@kachurun](https://github.com/kachurun)
