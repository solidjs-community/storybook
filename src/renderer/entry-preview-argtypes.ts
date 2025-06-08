import { enhanceArgTypes, extractComponentDescription } from 'storybook/internal/docs-tools';

import { extractArgTypes } from './extractArgTypes';

import type { SolidRenderer } from './public-types';
import type { ArgTypesEnhancer } from 'storybook/internal/types';

export const parameters = {
    docs: {
        extractArgTypes,
        extractComponentDescription,
    },
};

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [enhanceArgTypes];
