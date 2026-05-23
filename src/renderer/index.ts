import { IS_SOLID_JSX_FLAG } from './public-types';

/**
 * Public API for story authors (`Meta`, `StoryObj`, `Decorator`, `definePreview`, etc.).
 *
 * Re-exported from `storybook-solidjs-vite` for use in `.stories.ts` and `.storybook/preview.ts`.
 */
import type { DecoratorFunction } from 'storybook/internal/types';
import type { Decorator, SolidRenderer } from './public-types';

/** Use for decorators that do not return JSX (e.g. they only call `Story()`). */
export const createDecorator = (
    decorator: DecoratorFunction<SolidRenderer>
): Decorator => {
    return decorator as Decorator;
};

/** Use for decorators that return JSX. Ensures they run only once per story mount. */
export const createJSXDecorator = (
    decorator: DecoratorFunction<SolidRenderer>
): Decorator => {
    (decorator as Decorator)[IS_SOLID_JSX_FLAG] = true;

    return decorator as Decorator;
};

export { definePreview } from './preview';
export * from './public-types';
