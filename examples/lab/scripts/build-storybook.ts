/**
 * `storybook build` that fails when a preset does not load.
 *
 * Storybook logs "Failed to load preset" and still exits 0, so a broken
 * `storybook-solidjs-vite` preset would ship a static build without our renderer.
 *
 * Run from repo root: bun run check-docgen
 * Or here: bun run build-storybook
 */
import { spawn } from 'node:child_process';
import path from 'node:path';

import type { Readable, Writable } from 'node:stream';

const PRESET_LOAD_FAILURE = 'Failed to load preset';

const storybookBin = path.join(process.cwd(), 'node_modules/.bin/storybook');
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
});

if (presetLoadFailed) {
    console.error(`FAIL: storybook build printed "${ PRESET_LOAD_FAILURE }"`);
    process.exit(1);
}

process.exit(exitCode);
