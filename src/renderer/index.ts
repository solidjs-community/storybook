import { fileURLToPath } from 'node:url';

import { experimental_docgenProvider } from '../internal/componentManifest/docgen/docgenProvider';
import { experimental_storyDocsProvider } from '../internal/componentManifest/docgen/storyDocsProvider';
import { generateComponentManifests, getArgTypesData } from '../internal/componentManifest/manifests';
import { resolveSolidRendererEntry, resolveSolidVersion } from '../internal/solidVersion';

import type { PresetProperty } from 'storybook/internal/types';

export {
    /** @see https://storybook.js.org/docs/ai/manifests */
    generateComponentManifests as experimental_manifests,
    experimental_docgenProvider,
    experimental_storyDocsProvider,
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
    const solidVersion = await resolveSolidVersion(options.configDir);
    const entryPreview = resolveSolidRendererEntry(solidVersion);

    return input.concat([
        fileURLToPath(import.meta.resolve(entryPreview)),
        fileURLToPath(import.meta.resolve('storybook-solidjs-vite/renderer/docs')),
    ]);
};
