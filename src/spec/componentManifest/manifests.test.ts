import { join } from 'node:path';
import { invalidateProjectRootCache } from 'storybook/internal/common';
import { afterEach, describe, expect, it } from 'vitest';

import { generateComponentManifests, getArgTypesData } from '../../internal/componentManifest/manifests';
import { MANIFEST_DOCGEN_ENGINE } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';
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

describe('generateComponentManifests', () => {
    it('returns an empty stub with meta.docgen and does not read story files', async() => {
        const result = await generateComponentManifests(
            { extra: true },
            {
                manifestEntries: [{
                    id: 'example-button--primary',
                    title: 'Example/Button',
                    name: 'Primary',
                    importPath: 'this-file-does-not-exist.tsx',
                    type: 'story',
                    subtype: 'story',
                }],
            }
        );

        expect(result).toEqual({
            extra: true,
            components: {
                v: 0,
                components: {},
                meta: {
                    docgen: MANIFEST_DOCGEN_ENGINE,
                    durationMs: 0,
                },
            },
        });
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
