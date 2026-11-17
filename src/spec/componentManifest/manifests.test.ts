import { utimesSync } from 'node:fs';
import { join } from 'node:path';
import { invalidateProjectRootCache } from 'storybook/internal/common';
import { afterEach, describe, expect, it } from 'vitest';

import { generateComponentManifests, getArgTypesData } from '../../internal/componentManifest/manifests';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

function writeButton() {
    const dir = createSpecTempDir(tempDirs);

    writeSpecFiles(dir, {
        'Button.tsx': `
            export function Button(props: { label: string }) {
                return null;
            }
        `,
    });

    return dir;
}

const manifestEntries = [{
    id: 'example-button--primary',
    title: 'Example/Button',
    name: 'Primary',
    importPath: 'this-file-does-not-exist.tsx',
    type: 'story',
    subtype: 'story',
}];

function withFeatures(features: Record<string, unknown>) {
    return { apply: async() => features };
}

describe('generateComponentManifests', () => {
    it('returns an empty stub with the Solid engine id and does not read story files', async() => {
        const result = await generateComponentManifests(
            { extra: true },
            { manifestEntries, presets: withFeatures({ docgenServer: true }) }
        );

        expect(result).toEqual({
            extra: true,
            components: {
                v: 0,
                components: {},
                meta: {
                    docgen: 'solid-component-meta',
                    durationMs: 0,
                },
            },
        });
    });

    it('reports no engine when docgen is off', async() => {
        const existing = { extra: true };
        const result = await generateComponentManifests(
            existing,
            { manifestEntries, presets: withFeatures({ docgenServer: false }) }
        );

        expect(result).toBe(existing);
    });
});

describe('getArgTypesData', () => {
    it('reads an absolute component path, which addon-vitest passes', async() => {
        const dir = writeButton();
        const argTypes = await getArgTypesData(null, {
            componentFilePath: join(dir, 'Button.tsx'),
            componentExportName: 'Button',
        });

        expect(argTypes).toHaveProperty('label');
    }, 30_000);

    it('sees an edited component file on the next call', async() => {
        const dir = writeButton();
        const componentFilePath = join(dir, 'Button.tsx');

        await getArgTypesData(null, { componentFilePath, componentExportName: 'Button' });

        writeSpecFiles(dir, {
            'Button.tsx': `
                export function Button(props: { title: string }) {
                    return null;
                }
            `,
        });
        // The shared manager re-reads a file when its mtime moves; do not depend on clock resolution.
        utimesSync(componentFilePath, new Date(), new Date(Date.now() + 10_000));

        const argTypes = await getArgTypesData(null, { componentFilePath, componentExportName: 'Button' });

        expect(argTypes).toHaveProperty('title');
        expect(argTypes).not.toHaveProperty('label');
    }, 30_000);

    it('resolves a relative component path against the project root', async() => {
        const dir = writeButton();
        const previousRoot = process.env['STORYBOOK_PROJECT_ROOT'];

        process.env['STORYBOOK_PROJECT_ROOT'] = dir;
        invalidateProjectRootCache();

        try {
            const argTypes = await getArgTypesData(null, {
                componentFilePath: 'Button.tsx',
                componentExportName: 'Button',
            });

            expect(argTypes).toHaveProperty('label');
        }
        finally {
            if (previousRoot === undefined) {
                delete process.env['STORYBOOK_PROJECT_ROOT'];
            }
            else {
                process.env['STORYBOOK_PROJECT_ROOT'] = previousRoot;
            }

            invalidateProjectRootCache();
        }
    }, 30_000);
});
