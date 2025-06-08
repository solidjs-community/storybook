/* Configuration for default renderer. */
import { enhanceArgTypes } from 'storybook/internal/docs-tools';

import { solidReactivityDecorator } from './renderToCanvas';

import type { Decorator } from './public-types';
import type { ArgTypesEnhancer } from 'storybook/internal/types';

export { render } from './render';
export { renderToCanvas } from './renderToCanvas';

export const parameters = { renderer: 'solid' };
export const decorators: Decorator[] = [solidReactivityDecorator];
export const argTypesEnhancers: ArgTypesEnhancer[] = [enhanceArgTypes];
