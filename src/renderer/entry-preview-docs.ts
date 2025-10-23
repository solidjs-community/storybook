/* Configuration for doc-mode renderer (`storybook dev --docs`). */

import {
    enhanceArgTypes,
    extractComponentDescription,
} from 'storybook/internal/docs-tools';

import type { Decorator, SolidRenderer } from './public-types';
import type { ArgTypesEnhancer } from 'storybook/internal/types';

export { applyDecorators } from './applyDecorators';

export const parameters = {
    docs: {
        story: { inline: true },
        extractComponentDescription,
    },
};

export const decorators: Decorator[] = [];

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [
    enhanceArgTypes,
];
