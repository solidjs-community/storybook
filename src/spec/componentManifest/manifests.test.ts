import { describe, expect, it } from 'vitest';

import { enrichCsf } from '../../internal/codeExamples/enrichCsf';
import { generateComponentManifests } from '../../internal/componentManifest/manifests';
import { MANIFEST_DOCGEN_ENGINE } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';

function presetsWith(features: Record<string, unknown>) {
    return {
        apply: async() => features,
    };
}

describe('generateComponentManifests with experimentalDocgenServer', () => {
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
                presets: presetsWith({ experimentalDocgenServer: true }),
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

    it('still extracts when the flag is off', async() => {
        await expect(
            generateComponentManifests(
                {},
                {
                    manifestEntries: [{
                        id: 'example-button--primary',
                        title: 'Example/Button',
                        name: 'Primary',
                        importPath: 'this-file-does-not-exist.tsx',
                        type: 'story',
                        subtype: 'story',
                    }],
                    presets: presetsWith({ experimentalDocgenServer: false }),
                }
            )
        ).rejects.toThrow();
    });
});

describe('enrichCsf with experimentalDocgenServer', () => {
    it('skips snippet injection when the docgen server owns story-docs', async() => {
        const result = await enrichCsf(undefined, {
            presets: {
                apply: async() => ({
                    experimentalCodeExamples: true,
                    experimentalDocgenServer: true,
                }),
            },
        } as Parameters<typeof enrichCsf>[1]);

        expect(result).toBeUndefined();
    });
});
