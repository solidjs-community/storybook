# Testing Solid stories

For most projects, start with the **Vitest addon**. It turns your stories into browser tests and lets you run them from Storybook, the terminal, or CI.

**Portable stories are still supported.** They let you reuse a story in a test you write yourself. The Vitest addon uses the same API under the hood; the difference is how much setup and test execution you manage. See [Storybook's recommendation](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest).

## Choose a workflow

| Approach | When to use it | Status |
| --- | --- | --- |
| [Vitest addon](#vitest-addon-recommended) | Run stories and their interactions automatically in a real browser | Recommended starting point |
| [Portable stories in Vitest](#portable-stories-in-vitest) | Reuse stories in an existing test suite or write custom assertions | Supported alternative |
| [Render a story as a component](#render-a-story-as-a-component) | Control mounting yourself in a CSF Next component test | Advanced |
| [Jest](#jest) | Keep an existing Jest suite and its transforms | Requires custom setup |
| [Storybook test runner](#storybook-test-runner) | Test a running or published Storybook | Older alternative |
| [Playwright or Cypress](#playwright-or-cypress) | Drive a running Storybook with an existing browser test suite | Custom integration |
| [Storyshots](#storyshots) | Maintain or migrate old snapshot tests | Deprecated; migrate away |

The examples assume Storybook and the Solid Vite plugin are already configured. Use `@solidjs/vite-plugin` for Solid 2 or `vite-plugin-solid` for Solid 1. Manual Vitest config examples use Vitest 4.

## Vitest addon (recommended)

Install and configure the addon:

```bash
npx storybook add @storybook/addon-vitest
```

Accept the browser installation prompt. The addon uses Vitest Browser Mode with Playwright's Chromium browser. See the [Vitest addon instructions](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) if automatic setup needs help.

Run Storybook with `npm run storybook`, then use **Run tests** in the testing widget. For a Vitest project named `storybook`, you can also run:

```bash
# Watch mode
npx vitest --project=storybook

# One run, including in CI
npx vitest run --project=storybook
```

CLI runs do not need a running Storybook server. CI needs the Playwright browser installed; follow the [Storybook CI guide](https://storybook.js.org/docs/writing-tests/in-ci).

The addon applies your preview and project hooks. Keep the manual `setProjectAnnotations` setup below out of the addon's Vitest project.

For a working Solid 2 example, see the [lab Vitest config](./examples/lab/vitest.config.ts). The Storybook preset selects the renderer for your Solid version, so addon tests do not need the manual Solid 1 alias below.

### Write interaction tests

Put interactions and assertions in your stories. They run when you open the story and when the addon tests it. A story without interactions still gets a render test.

These examples use the repository's [Counter component](./examples/lab/src/scenarios/interactions/Counter.tsx), copied to `src/Counter.tsx`.

With CSF 3, use `play`:

```ts
// src/Counter.stories.ts
import { expect } from "storybook/test";
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { Counter } from "./Counter";

const meta = {
  component: Counter,
  args: { initial: 0 },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Increments: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Increment" }));
    await expect(canvas.getByTestId("counter-value")).toHaveTextContent("1");
  },
};
```

`play` also works with CSF Next. Alternatively, attach a named test with `.test`:

```ts
// src/Counter.stories.ts
import { expect } from "storybook/test";
import preview from "../.storybook/preview";
import { Counter } from "./Counter";

const meta = preview.meta({
  component: Counter,
  args: { initial: 0 },
});

export const Increments = meta.story({});

Increments.test("increments the counter", async ({ canvas, userEvent }) => {
  await userEvent.click(canvas.getByRole("button", { name: "Increment" }));
  await expect(canvas.getByTestId("counter-value")).toHaveTextContent("1");
});
```

The [CSF Next `.test` API](https://storybook.js.org/docs/api/csf/csf-next) is experimental. This adapter enables `experimentalTestSyntax` by default. Use `play` if you prefer the established API.

See [Storybook interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing) for mocks, queries, and async assertions. Solid JSX decorators still need [`createJSXDecorator`](./README.md#createjsxdecorator).

## Portable stories in Vitest

Choose this when you want to call stories from your own tests rather than have the addon generate the tests. You can use Vitest with a simulated DOM or [Browser Mode](https://vitest.dev/guide/browser/).

### Configure a DOM environment

Install Vitest and Happy DOM:

```bash
npm install --save-dev vitest happy-dom
```

For Solid 2:

```ts
// vitest.config.ts
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Merge these settings with any existing Vitest or Vite config your stories depend on, including aliases and CSS plugins. You can use `jsdom` instead of `happy-dom` by installing it and changing `environment`. For Solid 1, use the [config below](#solid-1-in-manual-vitest-tests).

A simulated DOM is useful for DOM assertions and interactions. For layout, real browser APIs, or browser rendering behavior, use Browser Mode or the Vitest addon.

### Apply your preview

For **CSF Next**, the preview already contains the project and addon annotations. Register its initialization hook:

```ts
// vitest.setup.ts
import { beforeAll } from "vitest";
import preview from "./.storybook/preview";

beforeAll(preview.composed.beforeAll);
```

For **CSF 3**, apply your preview and register the returned hook:

```ts
// vitest.setup.ts
import { beforeAll } from "vitest";
import { setProjectAnnotations } from "storybook-solidjs-vite";
import preview from "./.storybook/preview";

const annotations = setProjectAnnotations([preview]);

beforeAll(annotations.beforeAll);
```

If CSF 3 stories depend on addon decorators or loaders, include those addons' preview annotations alongside `preview`. See the [Storybook setup reference](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations).

### Run stories

With **CSF Next**, import a story directly:

```ts
// src/Button.test.ts
import { expect, test } from "vitest";
import { Primary } from "./Button.stories";

test("renders the primary button", async () => {
  await Primary.run();
  expect(document.body.querySelector("button")?.textContent).toBe("Button");
});
```

With **CSF 3**, compose the stories first:

```ts
// src/Button.test.ts
import { composeStories } from "storybook-solidjs-vite";
import { expect, test } from "vitest";
import * as stories from "./Button.stories";

const { Primary } = composeStories(stories);

test("renders the primary button", async () => {
  await Primary.run();
  expect(document.body.querySelector("button")?.textContent).toBe("Button");
});
```

These tests use the Button stories from the [README](./README.md#configuration). `run()` mounts the story and executes its loaders, story hooks, and `play` function. Import `expect` and `test` from Vitest in test files; use `storybook/test` in story interaction functions.

Run once with `npx vitest run`, or use `npx vitest` to watch for changes.

`composeStories` also accepts CSF Next modules. For a single CSF 3 story, use `composeStory(story, meta)`. To change args for one run, pass `await Primary.run({ args: { label: "Another label" } })`. See the [portable stories API](https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest) for annotations and other options.

### Solid 1 in manual Vitest tests

Outside the Storybook preset, select the Solid 1 renderer with an alias and inline the package so Vite applies it:

```ts
// vitest.config.ts
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "storybook-solidjs-vite/renderer/preview-addon": "storybook-solidjs-vite/renderer/solid1",
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    server: { deps: { inline: ["storybook-solidjs-vite"] } },
  },
});
```

## Render a story as a component

CSF Next exposes `Story.Component`, a Solid component with the story's args and decorators. Use it when your test needs to control mounting and prop updates. Use the same Solid plugin, renderer selection, and preview setup as the manual Vitest examples.

For Solid 2:

```tsx
// src/Button.test.tsx
import { render } from "@solidjs/web";
import { expect, test } from "vitest";
import { Primary } from "./Button.stories";

test("renders with different props", () => {
  const container = document.createElement("div");
  const dispose = render(() => <Primary.Component label="Custom label" />, container);

  try {
    expect(container.querySelector("button")?.textContent).toBe("Custom label");
  } finally {
    dispose();
  }
});
```

On Solid 1, import `render` from `solid-js/web` instead. Rendering `.Component` does not execute the story's `play` function or the full `run()` lifecycle. Use `run()` when you want that behavior.

You can also test a Solid component directly, without a story. That is an ordinary component test and does not apply Storybook's args or annotations.

## Jest

Portable stories can be reused in Jest, but Jest needs its own Solid JSX/TypeScript transforms, DOM environment, browser module resolution, and renderer mapping. It does not use your Vite plugin or aliases automatically. The Vitest configs above are not Jest configs.

Use the [Storybook Jest reference](https://storybook.js.org/docs/api/portable-stories/portable-stories-jest) for the portable API, importing it from `storybook-solidjs-vite`. This repository does not include a verified Jest configuration for Solid 1 or Solid 2. For a new suite, start with the Vitest addon or manual Vitest setup above.

## Storybook test runner

`@storybook/test-runner` is the older Jest-and-Playwright runner. It tests stories against a running or published Storybook. It has been superseded by the Vitest addon for Vite projects; it is separate from manually reusing stories in Jest.

Keep it for an existing runner setup or when you specifically need to test a deployed Storybook. Follow the [test-runner setup](https://storybook.js.org/docs/writing-tests/integrations/test-runner) and its [Vitest migration guide](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon/migration-guide). This repository's browser test suite uses the Vitest addon.

## Playwright or Cypress

An existing browser suite can open a story's iframe URL on a running or built-and-served Storybook and make assertions there. This is useful for custom navigation, screenshots, and testing a deployed build.

Use a story's iframe URL to test its canvas directly with your runner's usual browser APIs. See [Playwright navigation](https://playwright.dev/docs/writing-tests) or [Cypress visiting pages](https://docs.cypress.io/api/commands/visit).

This approach tests the served page. It does not require a Solid component-testing adapter for Playwright or Cypress, and it should not be confused with importing a story directly into those tools' component-testing runners. No such direct-import integration is configured in this repository.

## Other test types

These checks can sit alongside the workflows above:

- **Accessibility:** add `@storybook/addon-a11y` and follow the [accessibility testing guide](https://storybook.js.org/docs/writing-tests/accessibility-testing).
- **Visual regression:** compare browser screenshots; see [Storybook visual testing](https://storybook.js.org/docs/writing-tests/visual-testing).
- **DOM snapshots:** call `run()` in your test, then snapshot a specific element with your runner's snapshot assertion. See [snapshot testing](https://storybook.js.org/docs/writing-tests/snapshot-testing).
- **Coverage:** use the Vitest addon's [coverage setup](https://storybook.js.org/docs/writing-tests/test-coverage). Coverage measures executed code; it does not replace assertions.

## Storyshots

Storyshots is deprecated and no longer maintained. Do not add it to a new project. Migrate existing Storyshots tests to portable-story snapshots or another current testing workflow using the [Storybook migration guidance](https://storybook.js.org/docs/writing-tests/snapshot-testing).
