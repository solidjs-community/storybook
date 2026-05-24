# storybook-solidjs-vite

## 10.1.0

### Minor Changes

- 9058c6f: ### Solid 2 support

  Solid 2 projects should import types and APIs from `storybook-solidjs-vite/next` in stories, preview, and other app code for correct Solid 2 typings:

  ```ts
  import type { Preview, Meta, StoryObj } from "storybook-solidjs-vite/next";
  ```

  You can still import from `storybook-solidjs-vite` without `/next` on Solid 2, but that may produce TypeScript errors because those types target the Solid 1 renderer.

  In `.storybook/main.ts`, both framework names are valid:

  - `storybook-solidjs-vite` — auto-detects Solid version from installed `solid-js` (works for Solid 2 projects)
  - `storybook-solidjs-vite/next` — pins the Solid 2 renderer explicitly

  ```ts
  // Either is fine for a Solid 2 app
  framework: "storybook-solidjs-vite";
  framework: "storybook-solidjs-vite/next";
  ```

  Solid 1 projects keep using `storybook-solidjs-vite` for imports and framework config.

  ### CSF Next (optional)

  `definePreview`, `preview.meta`, and `meta.story` are also available on both Solid 1 and Solid 2. CSF 3 (`Meta`, `StoryObj`, default export meta) continues to work; migrate to CSF Next when you want factory-based typing, not as a requirement for Solid 2.

  ```ts
  // .storybook/main.ts
  import { defineMain } from "storybook-solidjs-vite/node";

  export default defineMain({
    framework: { name: "storybook-solidjs-vite/next" },
  });
  ```

  ```ts
  // .storybook/preview.tsx
  import { definePreview } from "storybook-solidjs-vite/next";
  ```

  ### Removals

  - **Removed `setProjectAnnotations`** — it only mattered for portable stories, which this integration does not support. If you adopt CSF Next, use `definePreview` in `.storybook/preview` and import that preview in story files.

  ### Internal

  Large refactor of renderer internals: shared preview pipeline, separate Solid 1 / Solid 2 renderers, and streamlined docgen integration.

## 10.0.13

### Patch Changes

- 28dd848: Component type fix

## 10.0.12

### Patch Changes

- b1e9733: Update deps

## 10.0.11

### Patch Changes

- f1a29bd: Update readme

## 10.0.10

### Patch Changes

- 9c29c1f: Add vite v8 to peerDependencies

## 10.0.9

### Patch Changes

- a148c37: chore: Added template files for storybook native CLI

## 10.0.8

### Patch Changes

- 9c504c3: Fix #22 and #23

## 10.0.7

### Patch Changes

- 8583b1e: version bump

## 10.0.6

### Patch Changes

- 5b1cb90: Reactivity fix (?)

## 10.0.5

### Patch Changes

- a8fbb10: chore: Refactor type imports and fix build config for declarations

## 10.0.4

### Patch Changes

- dadba20: Fix error with story render

## 10.0.3

### Patch Changes

- c07a6b8: chore: Update package files and build config

## 10.0.2

### Patch Changes

- 2bd67c2: Fix storybook tests

## 10.0.1

### Patch Changes

- 30482d3: Fix #15

## 10.0.0-rc.0

### Patch Changes

- Support for Storybook 10 rc.0

## 10.0.0-beta.0

### Minor Changes

- Support for Storybook 10 beta.2
- Package now builds only in ESM format
- Simplified configuration for docgen

## 9.0.2

### Patch Changes

- 7cd5760: chore: cleanup deps

## 9.0.1

### Patch Changes

- 3d0c18d: fix: ensure @storybook/builder-vite is required properly to prevent missing module error in yarn setups

## 9.0.0

### Minor Changes

- a47cdca: Storybook v9 Support
