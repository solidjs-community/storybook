import { applyDecorators as defaultDecorateStory } from '../applyDecorators';

import { sourceDecorator } from './sourceDecorator';

import type { SolidRenderer } from '../types';
import type { DecoratorFunction, LegacyStoryFn } from 'storybook/internal/types';

export const applyDecorators = (
    storyFn: LegacyStoryFn<SolidRenderer>,
    decorators: DecoratorFunction<SolidRenderer>[]
): LegacyStoryFn<SolidRenderer> => {
    // @ts-expect-error originalFn is not defined on the type for decorator. This is a temporary fix
    // that we will remove soon (likely) in favour of a proper concept of "inner" decorators.
    const jsxIndex = decorators.findIndex(d => d.originalFn === sourceDecorator);

    const reorderedDecorators = (jsxIndex === -1)
        ? decorators
        : [...decorators.splice(jsxIndex, 1), ...decorators];

    return defaultDecorateStory(storyFn, reorderedDecorators);
};
