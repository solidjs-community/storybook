# Storybook for SolidJS

![Storybook](https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white)
![SolidJS](https://img.shields.io/badge/SolidJS-2C4F7C?style=flat-square&logo=solid&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

![npm version](https://img.shields.io/npm/v/storybook-solidjs-vite?style=flat-square)
![npm downloads](https://img.shields.io/npm/dw/storybook-solidjs-vite?style=flat-square)
![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)

[Storybook](https://storybook.js.org/) framework adapter for [SolidJS](https://solidjs.com/) on Vite.

## ✨ Features

- 🤝 Feature parity with Storybook for React
- 🔀 Solid 1 and Solid 2 support
- 🏭 [Type-safe stories](#csf-4) with CSF 4 (`preview.meta()` / `meta.story()`); CSF 3 still works
- 📚 [Agent-ready docgen](#docgen): props in Controls and Docs, the [components manifest](https://storybook.js.org/docs/ai/manifests) ([debugger](#components-manifest-debugger)) and [Storybook MCP](#mcp)
- 🧾 [Code snippets](#code-snippets) generated from your stories
- 🧪 [Integrated testing](./TESTING.md) with the Vitest addon, plus [portable stories](#portable-stories) for Vitest or Jest
- ⚡ [Vite-powered builder](https://storybook.js.org/docs/builders/vite) and a [TypeScript-first setup](https://storybook.js.org/docs/configure/integration/typescript)
- 🧩 [Storybook addon support](https://storybook.js.org/docs/addons)

## 🚀 Getting Started

In your project, run:

```bash
npx create-storybook --type=solid
npm run storybook
```

Open the URL shown in the terminal.

## ⚙️ Configuration

Add the Solid plugin to your `vite.config.ts`: `@solidjs/vite-plugin` for Solid 2 or `vite-plugin-solid@^2` for Solid 1. Storybook uses your Vite config, so the plugin must be there.

Choose CSF 4 (previously called CSF Next) or CSF 3 to configure Storybook and write your first story.

### CSF 4

```ts
// .storybook/main.ts
import { defineMain } from "storybook-solidjs-vite";

export default defineMain({
  framework: "storybook-solidjs-vite",
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
});
```

```ts
// .storybook/preview.tsx
import addonDocs from "@storybook/addon-docs";
import { definePreview } from "storybook-solidjs-vite";

export default definePreview({
  addons: [addonDocs()],
});
```

The `addons` field is required. Use `[]` if you have none.

```ts
// src/Button.stories.ts
import preview from "../.storybook/preview";
import { Button } from "./Button";

const meta = preview.meta({
  component: Button,
});

export const Primary = meta.story({
  args: { label: "Button" },
});
```

### CSF 3

```ts
// .storybook/main.ts
import type { StorybookConfig } from "storybook-solidjs-vite";

export default {
  framework: "storybook-solidjs-vite",
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
} satisfies StorybookConfig;
```

```ts
// src/Button.stories.ts
import { Button } from "./Button";

import type { Meta, StoryObj } from "storybook-solidjs-vite";

const meta = {
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: "Button" },
};
```

### Docgen

Docgen fills in prop types and descriptions for **Controls**, **Docs**, and the **components manifest** from your TypeScript components. It's enabled by default. Check the output in the [manifest debugger](#components-manifest-debugger).

To disable docgen and generated code snippets:

```ts
// .storybook/main.ts
import type { StorybookConfig } from "storybook-solidjs-vite";

export default {
  framework: {
    name: "storybook-solidjs-vite",
    options: { docgen: false },
  },
} satisfies StorybookConfig;
```

### Code snippets

**Show code** blocks and the Code panel show how to use your component with the story's args. These JSX examples are generated automatically when [docgen](#docgen) is enabled.

To make them follow the controls as you change args, turn on Storybook's experimental live snippets:

```ts
// .storybook/main.ts
import type { StorybookConfig } from "storybook-solidjs-vite";

export default {
  framework: "storybook-solidjs-vite",
  features: {
    experimentalLiveServerSnippets: true,
  },
} satisfies StorybookConfig;
```

## 🤖 AI tools

### MCP

Storybook MCP lets AI agents find components, read their props, and preview stories. For component docs, keep [docgen](#docgen) enabled and install `@storybook/addon-docs`.

```bash
npx storybook add @storybook/addon-mcp
```

Follow the [instructions on the Storybook website](https://storybook.js.org/docs/ai/mcp/overview) to configure your agent.

### Components manifest debugger

[Component manifests](https://storybook.js.org/docs/ai/manifests) contain names, props, JSDoc, story IDs, and [generated snippets](#code-snippets). They're enabled by default (`features.componentsManifest`) and use [docgen](#docgen) for props.

Browse them in a running Storybook or a static build:

- **Debugger UI:** `http://localhost:6006/manifests/components.html` — inspect manifests, errors, and warnings
- **Components JSON:** `http://localhost:6006/manifests/components.json`
- **Docs JSON:** `http://localhost:6006/manifests/docs.json` (when MDX docs are present)

## 🧪 Testing

For most projects, use the [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) to run stories as browser tests. See the [testing guide](./TESTING.md) for setup, examples, and other ways to run tests.

### Portable stories

Reuse your stories as test cases in Vitest or Jest, with their args, decorators, and play functions.

Portable stories are supported for tests you write yourself. See the [manual Vitest setup](./TESTING.md#portable-stories-in-vitest), including the extra configuration for Solid 1.

## 🎨 Decorators

Decorators wrap stories with layout, providers, or other shared behavior. Save reusable decorators in `.storybook/decorators.tsx` and register them in your preview config.

### createJSXDecorator

Use `createJSXDecorator` whenever a decorator returns JSX, including a layout wrapper. Storybook normally re-runs decorators on updates, which can create duplicate Solid DOM nodes. This helper keeps the wrapper mounted while `context.args` and `context.globals` remain reactive.

```tsx
// .storybook/decorators.tsx
import { createJSXDecorator } from "storybook-solidjs-vite";

export const withLayout = createJSXDecorator((Story) => (
  <div style={{ margin: "3em" }}>
    <Story />
  </div>
));
```

### createDecorator

For side effects that run on every story update, use a plain function or `createDecorator`. The helper adds TypeScript typing and returns your function unchanged:

```tsx
// .storybook/decorators.tsx
import { createDecorator } from "storybook-solidjs-vite";

export const withTheme = createDecorator((Story, context) => {
  document.body.setAttribute("data-theme", context.globals.theme);
  return Story();
});
```

Add the decorators to `.storybook/preview.tsx` to apply them to all stories:

```tsx
// .storybook/preview.tsx
import { definePreview } from "storybook-solidjs-vite";
import { withLayout, withTheme } from "./decorators";

export default definePreview({
  addons: [],
  initialGlobals: { theme: "light" },
  decorators: [withLayout, withTheme],
});
```

With CSF 3, put the same `decorators` array in your exported preview object. See the [Storybook decorator docs](https://storybook.js.org/docs/writing-stories/decorators) for component-level and story-level decorators.

## 🔄 Migration

See the [Migration Guide](./MIGRATION.md) for 9 → 10 and 10 → 11.

## 🤝 Contributing

Issues and pull requests are welcome. [Report a bug or suggest a change](https://github.com/solidjs-community/storybook/issues).

For any agent-driven changes, follow [Briefback](https://briefback.dev).

## 📖 License

MIT

## 👤 Maintainer

<img src="https://github.com/kachurun.png" width="100" height="100" alt="@kachurun's avatar" style="border-radius: 50%;">

Maintained with ❤️ by [@kachurun](https://github.com/kachurun)
