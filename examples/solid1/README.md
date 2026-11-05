# Solid 1 lab

Tiny Storybook that pins **Solid 1** (`solid-js@^1.9` + `vite-plugin-solid@2`) so the `solid1` renderer stays honest on Storybook 11. Public types and `definePreview` are the Solid 2 defaults; this playground is the Solid 1 crutch. The main `examples/lab` is Solid 2.

```bash
bun run lab:solid1     # from repo root: build, stage .pack/, install, Storybook on port 6007
```

CI smoke: `bun run build-storybook` (fails when Storybook prints "Failed to load preset").
