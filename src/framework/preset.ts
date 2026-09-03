/**
 * A preset is a configuration that enables developers to quickly set up and
 * customize their environment with a specific set of features, functionalities, or integrations.
 *
 * @see https://storybook.js.org/docs/addons/writing-presets
 * @see https://storybook.js.org/docs/api/main-config/main-config
 */
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

import {
    resolveSolidRendererEntry,
    resolveSolidVersion,
    SOLID_DEFAULT_RENDERER_IMPORT,
    SOLID_LEGACY_RENDERER_IMPORT,
    SOLID_PREVIEW_ADDON_IMPORT,
} from '../internal/solidVersion';

import { isFrameworkDocgenEnabled } from './docgenOption';

import type { Options, PresetProperty } from 'storybook/internal/types';
import type { StorybookConfig } from './public-api';

/** Force a single copy of Solid packages (renderer + app + linked deps). */
const SOLID_DEDUPE_PACKAGES = [
    'solid-js',
    '@solidjs/web',
    '@solidjs/signals',
    '@solidjs/router',
    '@solidjs/meta',
] as const;

function mergeSolidDedupe(existing?: string | readonly string[]): string[] {
    const base = Array.isArray(existing) ? existing : [];

    return [...new Set([...base, ...SOLID_DEDUPE_PACKAGES])];
}

/**
 * Configures Storybook's internal features.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-core
 */
export const core: PresetProperty<'core', StorybookConfig> = {
    builder: import.meta.resolve('@storybook/builder-vite'),
    renderer: import.meta.resolve('storybook-solidjs-vite/renderer'),
};

/**
 * Enable the components manifest, docgen server, and CSF Next test syntax by default.
 * `framework.options.docgen: false` turns off `experimentalDocgenServer` so Controls /
 * Docs / manifest stop using the Solid component-meta worker.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-features
 */
export const features: PresetProperty<'features', StorybookConfig> = async(
    existing = {},
    { presets }: Options
) => {
    const framework = await presets.apply('framework');
    const docgenEnabled = isFrameworkDocgenEnabled(framework);

    return {
        componentsManifest: true,
        experimentalCodeExamples: true,
        experimentalDocgenServer: true,
        experimentalTestSyntax: true,
        ...existing,
        ...(docgenEnabled ? {} : { experimentalDocgenServer: false }),
    };
};

/**
 * Customize Storybook's Vite setup when using the Vite builder.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-vite-final
 */
export const viteFinal: StorybookConfig['viteFinal'] = async(config, { configDir }) => {
    const solidVersion = await resolveSolidVersion(configDir);
    const solidLegacyEntry = fileURLToPath(
        import.meta.resolve(SOLID_LEGACY_RENDERER_IMPORT)
    );
    const solidDefaultEntry = fileURLToPath(
        import.meta.resolve(SOLID_DEFAULT_RENDERER_IMPORT)
    );
    const solidRendererEntry = fileURLToPath(
        import.meta.resolve(resolveSolidRendererEntry(solidVersion))
    );
    const previewAddonEntry = fileURLToPath(
        import.meta.resolve(SOLID_PREVIEW_ADDON_IMPORT)
    );
    const inactiveRendererImport = solidVersion === 1
        ? SOLID_DEFAULT_RENDERER_IMPORT
        : SOLID_LEGACY_RENDERER_IMPORT;
    const inactiveRendererEntry = solidVersion === 1
        ? solidDefaultEntry
        : solidLegacyEntry;
    const rendererAlias = [
        { find: SOLID_PREVIEW_ADDON_IMPORT, replacement: solidRendererEntry },
        { find: previewAddonEntry, replacement: solidRendererEntry },
        { find: inactiveRendererImport, replacement: solidRendererEntry },
        { find: inactiveRendererEntry, replacement: solidRendererEntry },
    ];

    const optimizeDeps = {
        ...config.optimizeDeps,
        exclude: [
            ...(config.optimizeDeps?.exclude ?? []),
            'storybook-solidjs-vite',
        ],
    };

    return mergeConfig(config, {
        optimizeDeps,
        resolve: {
            ...config.resolve,
            alias: Array.isArray(config.resolve?.alias)
                ? [...config.resolve.alias, ...rendererAlias]
                : {
                    ...config.resolve?.alias,
                    [SOLID_PREVIEW_ADDON_IMPORT]: solidRendererEntry,
                    [previewAddonEntry]: solidRendererEntry,
                    [inactiveRendererImport]: solidRendererEntry,
                    [inactiveRendererEntry]: solidRendererEntry,
                },
            dedupe: mergeSolidDedupe(config.resolve?.dedupe),
        },
    });
};
