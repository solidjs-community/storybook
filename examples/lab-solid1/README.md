# Solid 1 lab

Tiny Storybook that pins **Solid 1** (`solid-js@^1.9` + `vite-plugin-solid@2`) so the `solid-legacy` renderer stays honest. The main `examples/lab` is Solid 2.

```bash
bun run build          # from repo root, so file:../.. has dist
cd examples/lab-solid1
bun install
bun run storybook      # port 6007
```

CI smoke: `bun run build-storybook`.
