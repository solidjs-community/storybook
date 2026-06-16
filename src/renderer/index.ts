import { fileURLToPath } from 'node:url';

import { enrichCsf } from '../internal/codeExamples/enrichCsf';
import { generateComponentManifests, getArgTypesData } from '../internal/componentManifest/manifests';
import { resolveSolidRendererEntry, resolveSolidVersion } from '../internal/solidVersion';

import type { PresetProperty } from 'storybook/internal/types';

export {
    /** Injects static JSX snippets into story parameters for Autodocs source blocks */
    enrichCsf as experimental_enrichCsf,
    /** @see https://storybook.js.org/docs/ai/manifests */
    generateComponentManifests as experimental_manifests,
    /** Used by Storybook MCP / story creation tooling */
    getArgTypesData as internal_getArgTypesData,
};

/**
 * Add additional scripts to run in the story preview.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-preview-annotations
 */
export const previewAnnotations: PresetProperty<'previewAnnotations'> = async(
    input = [],
    options
) => {
    const framework = await options.presets.apply('framework');
    const entryPreview = resolveSolidRendererEntry(
        resolveSolidVersion(framework, options.configDir)
    );

    return input.concat([
        fileURLToPath(import.meta.resolve(entryPreview)),
        fileURLToPath(import.meta.resolve('storybook-solidjs-vite/renderer/docs')),
    ]);
};
