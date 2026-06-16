import { hasVitePlugins } from '@storybook/builder-vite';
/**
 * A preset is a configuration that enables developers to quickly set up and
 * customize their environment with a specific set of features, functionalities, or integrations.
 *
 * @see https://storybook.js.org/docs/addons/writing-presets
 * @see https://storybook.js.org/docs/api/main-config/main-config
 */
import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';

import { solidComponentMetaPlugin } from '../internal/componentManifest/solidComponentMetaPlugin';
import {
    resolveSolidRendererEntry,
    resolveSolidVersion,
} from '../internal/solidVersion';

import type { PresetProperty } from 'storybook/internal/types';
import type { FrameworkOptions, StorybookConfig } from './public-api';

const SOLID_LEGACY_RENDERER_IMPORT = 'storybook-solidjs-vite/renderer/solid-legacy';

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
 * Enable the components manifest debugger by default.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-features#componentsmanifest
 */
export const features: PresetProperty<'features', StorybookConfig> = {
    componentsManifest: true,
    experimentalCodeExamples: true,
};

/**
 * Customize Storybook's Vite setup when using the Vite builder.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-vite-final
 */
export const viteFinal: StorybookConfig['viteFinal'] = async(config, { presets, configDir }) => {
    const existPlugins = [...(config?.plugins ?? [])];
    const plugins = [];

    const framework = await presets.apply('framework');
    const frameworkOptions: FrameworkOptions = (typeof framework === 'string') ? {} : (framework.options ?? {});
    const solidVersion = resolveSolidVersion(framework, configDir);
    const solidLegacyEntry = fileURLToPath(
        import.meta.resolve(SOLID_LEGACY_RENDERER_IMPORT)
    );
    const solidRendererEntry = fileURLToPath(
        import.meta.resolve(resolveSolidRendererEntry(solidVersion))
    );
    const aliasApplied = solidLegacyEntry !== solidRendererEntry;
    const rendererAlias = aliasApplied
        ? [
            { find: SOLID_LEGACY_RENDERER_IMPORT, replacement: solidRendererEntry },
            { find: solidLegacyEntry, replacement: solidRendererEntry },
        ]
        : [];

    if (frameworkOptions.docgen !== false) {
        plugins.push(
            solidComponentMetaPlugin({ enabled: true })
        );
    }

    if (!(await hasVitePlugins(existPlugins, ['solid']))) {
        plugins.push(
            await import('vite-plugin-solid').then(module => module.default())
        );
    }

    const optimizeDeps = {
        ...config.optimizeDeps,
        exclude: [
            ...(config.optimizeDeps?.exclude ?? []),
            'storybook-solidjs-vite',
        ],
    };

    return mergeConfig(config, {
        plugins,
        optimizeDeps,
        resolve: {
            ...config.resolve,
            alias: Array.isArray(config.resolve?.alias)
                ? [...config.resolve.alias, ...rendererAlias]
                : {
                    ...config.resolve?.alias,
                    ...(aliasApplied
                        ? {
                            [SOLID_LEGACY_RENDERER_IMPORT]: solidRendererEntry,
                            [solidLegacyEntry]: solidRendererEntry,
                        }
                        : {}),
                },
            dedupe: mergeSolidDedupe(config.resolve?.dedupe),
        },
    });
};
