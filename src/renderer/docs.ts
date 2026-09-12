import {
    enhanceArgTypes,
    extractComponentDescription,
} from 'storybook/internal/docs-tools';

import type { ArgTypesEnhancer } from 'storybook/internal/types';
import type { SolidRenderer } from '../preview/public-api';

/** Storybook-recommended control matchers (same defaults as `storybook init`). */
export const controlMatchers = {
    color: /(?:background|color)$/i,
    date: /Date$/,
} as const;

export const parameters = {
    controls: {
        matchers: controlMatchers,
    },
    docs: {
        story: { inline: true },
        extractComponentDescription,
    },
};

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [enhanceArgTypes];
