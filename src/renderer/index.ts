import { fileURLToPath } from 'node:url';

import { enrichCsf } from '../internal/codeExamples/enrichCsf';
import { generateComponentManifests, getArgTypesData } from '../internal/componentManifest/manifests';
import { resolveSolidVersion } from '../internal/solidVersion';

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
    const docsConfig = await options.presets.apply('docs', {}, options);
    const docsEnabled = Object.keys(docsConfig).length > 0;
    const result: string[] = [];
    const framework = await options.presets.apply('framework');
    const solidVersion = resolveSolidVersion(framework, options.configDir);
    const entryPreview = solidVersion === 2
        ? 'storybook-solidjs-vite/renderer/solid-2'
        : 'storybook-solidjs-vite/renderer/solid-1';

    return result
        .concat(input)
        .concat([
            fileURLToPath(import.meta.resolve(entryPreview)),
            fileURLToPath(import.meta.resolve('storybook-solidjs-vite/renderer/argtypes')),
        ])
        .concat(
            docsEnabled
                ? [
                    fileURLToPath(import.meta.resolve('storybook-solidjs-vite/renderer/docs')),
                ]
                : []
        );
};
