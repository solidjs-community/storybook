/**
 * A preset is a configuration that enables developers to quickly set up and
 * customize their environment with a specific set of features, functionalities, or integrations.
 *
 * @see https://storybook.js.org/docs/addons/writing-presets
 * @see https://storybook.js.org/docs/api/main-config/main-config
 */
import { fileURLToPath } from 'node:url';

import { resolveSolidVersion } from '../framework/solidVersion';

import type { PresetProperty } from 'storybook/internal/types';
import type { FrameworkConfig } from '../framework/types';

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
    const solidVersion = resolveSolidVersion(framework as FrameworkConfig, options.configDir);
    const entryPreview = solidVersion === 2
        ? 'storybook-solidjs-vite/entry-preview/solid-2'
        : 'storybook-solidjs-vite/entry-preview/solid-1';

    return result
        .concat(input)
        .concat([
            fileURLToPath(import.meta.resolve(entryPreview)),
            fileURLToPath(import.meta.resolve('storybook-solidjs-vite/entry-preview/argtypes')),
        ])
        .concat(
            docsEnabled
                ? [
                    fileURLToPath(import.meta.resolve('storybook-solidjs-vite/entry-preview/docs')),
                ]
                : []
        );
};
