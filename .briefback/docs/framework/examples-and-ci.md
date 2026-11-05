# Examples and CI

How `examples/lab` (Solid 2) and `examples/solid1` (Solid 1) install this package, and the checks CI runs against them.

See also: [modules index](./modules.md), [preset and version](./preset-and-version.md).

## Run an example

```bash
bun install          # root
bun run lab          # build, stage, install examples/lab, Storybook on 6006
bun run lab:solid1   # same for examples/solid1, port 6007
```

After changing `src/`, re-run `bun run build && bun run stage`, then `bun install` in the example. Its copy of the package is a snapshot taken at install time.

## How the examples get the package

`bun run stage` (`scripts/stage-package.ts`) packs the current `dist` with `bun pm pack` and unpacks it into `.pack/storybook-solidjs-vite` (gitignored). That holds exactly the published files (`files` in `package.json`). Both examples depend on `file:../../.pack/storybook-solidjs-vite`, so they install the package and its `dependencies` the way a user would. Each example keeps its own `bun.lock`; directory dependencies store no hash, so `--frozen-lockfile` passes after a rebuild.

Two setups were tried and dropped:

- **`file:../..`** — bun copies the whole repo, including the other example's `node_modules`, into the example. Every install nested one level deeper until paths hit "File name too long", and installs took tens of minutes.
- **Root `workspaces`** — installs were fast, but Changesets then treats the root as a monorepo container and fails with "Found changeset … for package storybook-solidjs-vite which is not in the workspace", which broke the `next` snapshot release. Changesets cannot publish a monorepo's root package.

`files` no longer has `**/*.d.ts`: that glob packed `.d.ts` files from `examples/*/node_modules` whenever examples were installed.

## Preset-load check

Storybook prints "Failed to load preset" and still exits 0. Both examples' `build-storybook` run `scripts/build-storybook.ts`, which finds `node_modules/.bin/storybook` at or above the current directory, forwards the output, and exits 1 on that message or when the binary cannot start.

## CI

`.github/workflows/ci.yml`, in order:

1. Root `bun install --frozen-lockfile`, `bun run build`, `bun run stage`, `bun run test`
2. `examples/lab`: `bun install --frozen-lockfile`, Playwright Chromium, root `bun run check-docgen` (static build + docgen assertions), `bun run test` (Vitest browser)
3. `examples/solid1`: `bun install --frozen-lockfile`, `bun run build-storybook`

`release.yml` installs and builds the root only; `changeset version --snapshot next` and `changeset publish` see a single package.

## Upgrading Storybook in the examples

Storybook prereleases can be younger than a local `minimumReleaseAge` in `~/.bunfig.toml`. Pass `--minimum-release-age=0` to `bun add` / `bun install` for those packages, and bump the root, `examples/lab` and `examples/solid1` together.
