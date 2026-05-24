import { IS_SOLID_JSX_FLAG } from '../shared/public-types';

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

export * from './public-types';

export type {
    DefinePreviewInput,
    SolidMeta,
    SolidPreview,
    SolidStory,
} from './define-preview';
