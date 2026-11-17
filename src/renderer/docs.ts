import {
    enhanceArgTypes,
    extractComponentDescription,
} from 'storybook/internal/docs-tools';

import { printHole } from './print-hole';

import type { ArgTypesEnhancer } from 'storybook/internal/types';
import type { SolidRenderer } from '../preview/public-api';

/** Storybook-recommended control matchers (same defaults as `storybook init`). */
export const controlMatchers = {
    color: /(?:background|color)$/i,
    date: /Date$/,
} as const;

// Story docs come from the docgen server, whose templates `printHole` fills as controls change.
const useStaticServiceSnippets = 'FEATURES' in globalThis && globalThis.FEATURES?.docgenServer;

export const parameters = {
    controls: {
        matchers: controlMatchers,
    },
    docs: {
        story: { inline: true },
        extractComponentDescription,
        ...(useStaticServiceSnippets ? { source: { printHole } } : {}),
    },
};

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [enhanceArgTypes];
