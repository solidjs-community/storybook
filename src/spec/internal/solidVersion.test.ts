import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveSolidVersion } from '../../internal/solidVersion';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

const tempDirs: string[] = [];

/** Outside the repo so Node resolution cannot walk into this package's `solid-js`. */
function createDirOutsideRepo(dirs: string[]) {
    const dir = mkdtempSync(join(tmpdir(), 'solid-version-'));

    dirs.push(dir);

    return dir;
}

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('resolveSolidVersion', () => {
    it('reads the solid-js major installed next to configDir, not the package manager of the running process', async() => {
        const dir = createSpecTempDir(tempDirs);

        writeSpecFiles(dir, {
            'package.json': JSON.stringify({ name: 'consumer' }),
            '.storybook/main.ts': 'export default {};\n',
            'node_modules/solid-js/package.json': JSON.stringify({
                name: 'solid-js',
                version: '2.0.0-rc.6',
            }),
        });

        await expect(resolveSolidVersion(join(dir, '.storybook'))).resolves.toBe(2);
    });

    it('throws when solid-js is not on the resolve walk from configDir', async() => {
        const dir = createDirOutsideRepo(tempDirs);

        writeSpecFiles(dir, {
            'package.json': JSON.stringify({ name: 'consumer' }),
            '.storybook/main.ts': 'export default {};\n',
        });

        await expect(resolveSolidVersion(join(dir, '.storybook'))).rejects.toThrow(
            'Could not detect Solid version: `solid-js` is not installed.'
        );
    });

    it('does not pick solid-js from a sibling workspace package', async() => {
        const dir = createDirOutsideRepo(tempDirs);

        writeSpecFiles(dir, {
            'package.json': JSON.stringify({ name: 'workspace-root' }),
            '.storybook/main.ts': 'export default {};\n',
            'packages/ui/package.json': JSON.stringify({ name: 'ui' }),
            'packages/ui/node_modules/solid-js/package.json': JSON.stringify({
                name: 'solid-js',
                version: '1.9.15',
            }),
        });

        await expect(resolveSolidVersion(join(dir, '.storybook'))).rejects.toThrow(
            'Could not detect Solid version: `solid-js` is not installed.'
        );
    });

    it('throws when the installed major is not 1 or 2', async() => {
        const dir = createSpecTempDir(tempDirs);

        writeSpecFiles(dir, {
            'package.json': JSON.stringify({ name: 'consumer' }),
            '.storybook/main.ts': 'export default {};\n',
            'node_modules/solid-js/package.json': JSON.stringify({
                name: 'solid-js',
                version: '3.0.0',
            }),
        });

        await expect(resolveSolidVersion(join(dir, '.storybook'))).rejects.toThrow(
            'Unsupported Solid version: 3.0.0'
        );
    });
});
