import { describe, expect, it } from 'vitest';

import { generateComponentManifests } from '../../internal/componentManifest/manifests';
import { MANIFEST_DOCGEN_ENGINE } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';

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
