/* Configuration for default renderer (default preview.ts params) */
import { global } from '@storybook/global';
import { configure } from 'storybook/test';


import type { Decorator } from './public-types';

export const parameters = {
    renderer: 'solid',
};

export const decorators: Decorator[] = [
    (StoryFn, context) => {
        // @ts-expect-error this feature flag not available in global storybook types
        if (context.tags?.includes('test-fn') && !global.FEATURES?.experimentalTestSyntax) {
            throw new Error(
                'To use the experimental test function, you must enable the experimentalTestSyntax feature flag. See https://storybook.js.org/docs/10/api/main-config/main-config-features#experimentalTestSyntax'
            );
        }

        return StoryFn();
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

                    // @ts-expect-error global jest
                    if (typeof jest !== 'undefined' && jest != null && ((setTimeout as any)._isMockFunction === true || Object.prototype.hasOwnProperty.call(setTimeout, 'clock'))) {
                        // @ts-expect-error global jest
                        jest!.advanceTimersByTime(0);
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


export { mount, render, renderToCanvas } from './render';
export { applyDecorators } from './applyDecorators';
