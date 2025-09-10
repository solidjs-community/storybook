/**
 * A preset is a configuration that enables developers to quickly set up and
 * customize their environment with a specific set of features, functionalities, or integrations.
 *
 * @see https://storybook.js.org/docs/addons/writing-presets
 * @see https://storybook.js.org/docs/api/main-config/main-config
 */
import { hasVitePlugins } from '@storybook/builder-vite';

import { mergeConfig } from 'vite';

import type { FrameworkOptions, StorybookConfig } from './types';
import type { PresetProperty } from 'storybook/internal/types';

/**
 * Configures Storybook's internal features.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-core
 */
export const core: PresetProperty<'core', StorybookConfig> = {
    builder: import.meta.resolve('@storybook/builder-vite'),
    renderer: import.meta.resolve('./renderer'),
};

/**
 * Customize Storybook's Vite setup when using the Vite builder.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-vite-final
 */
export const viteFinal: StorybookConfig['viteFinal'] = async(config, { presets }) => {
    const existPlugins = [...(config?.plugins ?? [])];
    const plugins = [];

    // Add docgen plugin
    const framework = await presets.apply('framework');
    const frameworkOptions: FrameworkOptions = (typeof framework === 'string') ? {} : (framework.options ?? {});

    // Use vite-plugin-react-docgen-typescript for docgen
    if (frameworkOptions.docgen !== false) {
        const reactDocgenTypescriptPlugin = await import('@joshwooding/vite-plugin-react-docgen-typescript').then(module => module.default);

        plugins.push(
            reactDocgenTypescriptPlugin({
                // We *need* this set so that RDT returns default values in the same format as react-docgen
                savePropValueAsString: true,
                shouldExtractLiteralValuesFromEnum: true,
                propFilter: (prop: any) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
                ...frameworkOptions.docgenOptions,
            })
        );
    }

    // Add solid plugin if not present
    if (!(await hasVitePlugins(existPlugins, ['solid']))) {
        plugins.push(
            await import('vite-plugin-solid').then(module => module.default())
        );
    }

    return mergeConfig(config, {
        plugins,
    });
};
