/* Configuration for default renderer (default preview.ts params) */
import { global } from '@storybook/global';
import { configure } from 'storybook/test';

import { solidReactivityDecorator } from './renderToCanvas';

import type { Decorator, SolidRenderer, StoryContext } from './public-types';


import type { SolidRenderer } from './types';
import type { BaseAnnotations } from 'storybook/internal/types';


export const parameters = {
    renderer: 'solid',
};

export const decorators: Decorator[] = [
    solidReactivityDecorator,
    (story, context) => {
        // @ts-expect-error this feature flag not available in global storybook types
        if (context.tags?.includes('test-fn') && !global.FEATURES?.experimentalTestSyntax) {
            throw new Error(
                'To use the experimental test function, you must enable the experimentalTestSyntax feature flag. See https://storybook.js.org/docs/10/api/main-config/main-config-features#experimentalTestSyntax'
            );
        }

        return story();
    },
];

export const beforeAll = async() => {
    try {
        configure({
            unstable_advanceTimersWrapper: (cb: () => any) => cb(),
            asyncWrapper: async(cb: () => any) => {
                const result = await cb();

                await new Promise<void>((resolve) => {
                    setTimeout(() => resolve(), 0);
                    if (_jestFakeTimersAreEnabled()) {
                        // @ts-expect-error global jest
                        jest.advanceTimersByTime(0);
                    }
                });

                return result;
            },
            eventWrapper: (cb: () => any) => cb(),
        });
    }
    catch {
        // storybook/test might not be available; noop
    }
};

export const mount: BaseAnnotations<SolidRenderer>['mount'] = (context: StoryContext) => async(ui) => {
    if (ui != null) {
        context.originalStoryFn = () => ui;
    }

    await context['renderToCanvas']();

    return context.canvas;
};


function _jestFakeTimersAreEnabled() {
    // @ts-expect-error global jest
    if (typeof jest !== 'undefined' && jest !== null) {
        // legacy timers or modern timers
        return (setTimeout as any)._isMockFunction === true || Object.prototype.hasOwnProperty.call(setTimeout, 'clock');
    }

    return false;
}

export { render } from './render';
export { renderToCanvas } from './renderToCanvas';
export { applyDecorators } from './applyDecorators';
