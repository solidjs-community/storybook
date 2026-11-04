---
"storybook-solidjs-vite": major
---

### CSF Next types on Storybook 11's meta-args model

`SolidPreview`, `SolidMeta` and `SolidStory` now build on core's `MetaInput`, `MetaTypes`, `StoryArgs`, `TypedMetaArgKeys` and `PreviewAddonEntry`, like `@storybook/react`.

- Meta args need no `as const`. `meta.input.args` is typed as the component declares those props.
- Every key in meta args must be an arg (a prop, a typed `render` arg, a decorator arg, or one declared with `preview.type<{ args }>()`).
- Args set to `fn()` in meta are typed as the component declares them. Use `mocked()` from `storybook/test` for the mock API.
- `meta.type<S>()` returns a `SolidMeta`, so its stories keep the `.story()` overloads and `story.Component`.
- **Breaking:** `definePreview()` requires `addons`. Pass `[]` if you have none. Addon preview namespaces are accepted.
- **Breaking:** the second type argument of `SolidMeta` is the union of arg names set in meta, not the meta input type.

See `MIGRATION.md` → "CSF Next types".
