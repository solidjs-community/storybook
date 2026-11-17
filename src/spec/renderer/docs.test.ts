import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PrintHole } from 'storybook/internal/docs-tools';

// `parameters` reads `FEATURES` once, when the module loads.
async function loadDocsParameters(features: Record<string, boolean> | undefined) {
    vi.resetModules();
    vi.stubGlobal('FEATURES', features);

    const { parameters } = await import('../../renderer/docs');

    return parameters.docs as { source?: { printHole?: PrintHole } };
}

describe('docs parameters', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sets the hole printer for live snippets when story docs come from the docgen server', async() => {
        const docs = await loadDocsParameters({ docgenServer: true });

        expect(docs.source?.printHole?.({ kind: 'attr', arg: 'label' }, 'Go')).toBe('label="Go"');
    });

    it('sets no hole printer without the docgen server', async() => {
        expect((await loadDocsParameters({ docgenServer: false })).source).toBeUndefined();
        expect((await loadDocsParameters(undefined)).source).toBeUndefined();
    });
});
