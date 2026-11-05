/**
 * `storybook build` that fails when a preset does not load.
 *
 * Storybook logs "Failed to load preset" and still exits 0, so a broken
 * `storybook-solidjs-vite` preset would ship a static build without our renderer.
 *
 * Runs `storybook build` from the nearest `node_modules/.bin` at or above the
 * current directory (workspaces hoist the bin to the repo root).
 * Used by `build-storybook` in `examples/lab` and `examples/solid1`.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { Readable, Writable } from 'node:stream';

const PRESET_LOAD_FAILURE = 'Failed to load preset';

function findStorybookBin(dir: string): string | undefined {
    const bin = path.join(dir, 'node_modules/.bin/storybook');

    if (existsSync(bin)) {
        return bin;
    }

    const parent = path.dirname(dir);

    return parent === dir ? undefined : findStorybookBin(parent);
}

const storybookBin = findStorybookBin(process.cwd());

if (!storybookBin) {
    console.error(`FAIL: no node_modules/.bin/storybook at or above ${ process.cwd() }`);
    process.exit(1);
}

const child = spawn(storybookBin, ['build', ...process.argv.slice(2)], {
    stdio: ['inherit', 'pipe', 'pipe'],
});

let presetLoadFailed = false;

function forward(stream: Readable, target: Writable) {
    // Keep the end of the previous chunk so a message split across chunks still matches.
    let tail = '';

    stream.on('data', (chunk: Buffer) => {
        target.write(chunk);

        const text = tail + chunk.toString();

        if (text.includes(PRESET_LOAD_FAILURE)) {
            presetLoadFailed = true;
        }

        tail = text.slice(-PRESET_LOAD_FAILURE.length);
    });
}

forward(child.stdout, process.stdout);
forward(child.stderr, process.stderr);

const exitCode = await new Promise<number>((resolve) => {
    child.on('close', code => resolve(code ?? 1));
    child.on('error', (error) => {
        console.error(`FAIL: could not start ${ storybookBin }: ${ error.message }`);
        resolve(1);
    });
});

if (presetLoadFailed) {
    console.error(`FAIL: storybook build printed "${ PRESET_LOAD_FAILURE }"`);
    process.exit(1);
}

process.exit(exitCode);
