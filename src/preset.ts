import { hasVitePlugins } from '@storybook/builder-vite';
import { dirname } from 'path';

/**
 * A preset is a configuration that enables developers to quickly set up and
 * customize their environment with a specific set of features, functionalities, or integrations.
 *
 * @see https://storybook.js.org/docs/addons/writing-presets
 * @see https://storybook.js.org/docs/api/main-config/main-config
 */

import type { StorybookConfig } from './types';
import type { PresetProperty } from 'storybook/internal/types';

// Helper for getting the location of dependencies.
const getAbsolutePath = (input: string): string => dirname(require.resolve(input));

/**
 * Configures Storybook's internal features.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-core
 */
export const core: PresetProperty<'core', StorybookConfig> = {
    builder: getAbsolutePath('@storybook/builder-vite'),
    renderer: getAbsolutePath('@kachurun/storybook-solid-vite/renderer'),
};

/**
 * Customize Storybook's Vite setup when using the Vite builder.
 *
 * @see https://storybook.js.org/docs/api/main-config/main-config-vite-final
 */
export const viteFinal: StorybookConfig['viteFinal'] = async(config, { presets }) => {
    const { plugins = [] } = config;

    // Add docgen plugin
    const { reactDocgen: reactDocgenOption, reactDocgenTypescriptOptions } = await presets.apply<any>('typescript', {});

    let typescriptPresent = false;

    try {
        require.resolve('typescript');
        typescriptPresent = true;
    }
    catch (e) {}

    if (reactDocgenOption === 'react-docgen-typescript' && typescriptPresent) {
        const { default: reactDocgenTypescriptPlugin } = await import('@joshwooding/vite-plugin-react-docgen-typescript');

        // 
        plugins.push(
            reactDocgenTypescriptPlugin({
                ...reactDocgenTypescriptOptions,
                // We *need* this set so that RDT returns default values in the same format as react-docgen
                savePropValueAsString: true,
            })
        );
    }

    // Add solid plugin if not present
    if (!(await hasVitePlugins(plugins, ['vite-plugin-solid']))) {
        const { default: solidPlugin } = await import('vite-plugin-solid');

        plugins.push(
            solidPlugin()
        );
    }

    return config;
};
