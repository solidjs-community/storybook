import { createComponent } from 'solid-js';
import { defaultDecorateStory } from 'storybook/preview-api';

import { getStoryId, isStoryRendered } from './render';

import type { Decorator } from './public-types';
import type { SolidRenderer } from './types';
import type { DecoratorFunction, LegacyStoryFn } from 'storybook/internal/types';

/**
 * Flag used to mark decorators that return JSX elements.
 * Decorators with this flag will be skipped on subsequent renders
 * to prevent double-rendering issues in SolidJS.
 */
export const IS_SOLID_JSX_FLAG = '__isJSX';

/**
 * Applies decorators to a story function, with special handling for JSX-returning decorators.
 *
 * This function wraps decorators to prevent double-rendering when a story is already rendered.
 * If a decorator is marked with `IS_SOLID_JSX_FLAG`, it will be skipped on subsequent renders
 * to avoid re-executing JSX-returning decorators that have already been rendered.
 *
 * @param storyFn - The story function to apply decorators to
 * @param _decorators - Array of decorators to apply to the story
 * @returns A decorated story function
 */
export const applyDecorators = (
    storyFn: LegacyStoryFn<SolidRenderer>,
    _decorators: Decorator[]
): LegacyStoryFn<SolidRenderer> => {
    const decorators = _decorators.map(
        (decorator): Decorator => {
            // NOTE: Decorator here is probably wrapped by Storybook, and the real user decorator
            // is inside originalFn. We check both the wrapper and the original function for the JSX flag.
            const originalFn = (decorator as Decorator & { originalFn?: Decorator }).originalFn;
            const isJSX = Boolean(
                decorator[IS_SOLID_JSX_FLAG] || originalFn?.[IS_SOLID_JSX_FLAG]
            );

            return (StoryFn, context) => {
                if (isJSX) {
                    const storyId = getStoryId(context);

                    if (storyId && isStoryRendered(storyId)) {
                        return StoryFn(context);
                    }
                }

                return decorator(StoryFn, context);
            };
        }
    );

    return defaultDecorateStory((context) => {
        const storyId = getStoryId(context);

        if (storyId && isStoryRendered(storyId)) {
            return null;
        }

        return createComponent(storyFn, context);
    }, decorators);
};

/**
 * Creates a decorator with proper type safety.
 *
 * Use this for decorators that don't return JSX (e.g., they only call `Story()`).
 * This helper ensures type safety for your decorators.
 *
 * @param decorator - The decorator function
 * @returns The same decorator with proper typing
 */
export const createDecorator = (
    decorator: DecoratorFunction<SolidRenderer>
): Decorator => {
    return decorator as Decorator;
};

/**
 * Creates a decorator that is marked as returning JSX.
 *
 * This helper function marks a decorator with the `IS_SOLID_JSX_FLAG` flag,
 * indicating that the decorator returns JSX elements. This flag is used by
 * `applyDecorators` to prevent double-rendering of JSX-returning decorators.
 *
 * @param decorator - The decorator function that returns JSX
 * @returns The same decorator, marked with the JSX flag
 */
export const createJSXDecorator = (
    decorator: DecoratorFunction<SolidRenderer>
): Decorator => {
    (decorator as Decorator)[IS_SOLID_JSX_FLAG] = true;

    return decorator as Decorator;
};
