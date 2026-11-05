/**
 * Stages the package as it would be published, for the examples to install.
 *
 * `examples/*` depend on `file:../../.pack/storybook-solidjs-vite`. Pointing them at
 * `file:../..` made bun copy the whole repo (including the other example's
 * `node_modules`) into each example, so every install nested deeper. Root
 * `workspaces` would avoid the copy, but Changesets then treats the root as a
 * monorepo container and refuses to version it.
 *
 * Packs the current `dist` (run `bun run build` first) with `bun pm pack` and
 * unpacks it into `.pack/storybook-solidjs-vite`. Re-run `bun install` in an
 * example to pick up a new stage.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const packDir = path.join(root, '.pack');
const tarball = path.join(packDir, 'storybook-solidjs-vite.tgz');
const stageDir = path.join(packDir, 'storybook-solidjs-vite');

if (!existsSync(path.join(root, 'dist/index.js'))) {
    console.error('FAIL: no dist/index.js. Run `bun run build` first.');
    process.exit(1);
}

function run(command: string, args: string[]) {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });

    if (result.status !== 0) {
        console.error(`FAIL: ${ command } ${ args.join(' ') }`);
        process.exit(result.status ?? 1);
    }
}

rmSync(packDir, { recursive: true, force: true });
mkdirSync(stageDir, { recursive: true });

run('bun', ['pm', 'pack', '--ignore-scripts', '--quiet', '--filename', tarball]);
run('tar', ['-xzf', tarball, '-C', stageDir, '--strip-components', '1']);
rmSync(tarball);

console.log(`Staged ${ path.relative(root, stageDir) }`);
