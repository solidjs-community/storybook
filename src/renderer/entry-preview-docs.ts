/* Configuration for doc-mode renderer (`storybook dev --docs`). */

import {
    enhanceArgTypes,
    extractComponentDescription,
} from 'storybook/internal/docs-tools';


import { sourceDecorator } from './docs/sourceDecorator';

import type { Decorator, SolidRenderer } from './public-types';
import type { ArgTypesEnhancer } from 'storybook/internal/types';

export { applyDecorators } from './docs/applyDecorators';

export const parameters = {
    docs: {
        story: { inline: true },
        extractComponentDescription,
    },
};

export const decorators: Decorator[] = [sourceDecorator];

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [
    enhanceArgTypes,
];
