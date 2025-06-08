import { createComponent } from 'solid-js';
import { defaultDecorateStory } from 'storybook/preview-api';

import type { SolidRenderer } from './types';
import type { DecoratorFunction, LegacyStoryFn } from 'storybook/internal/types';

export const applyDecorators = (
    storyFn: LegacyStoryFn<SolidRenderer>,
    decorators: DecoratorFunction<SolidRenderer>[]
): LegacyStoryFn<SolidRenderer> => {
    return defaultDecorateStory(context => createComponent(storyFn, context), decorators);
};
