/* Configuration for default renderer. */
import { global } from '@storybook/global';
import { configure } from 'storybook/test';

import { solidReactivityDecorator } from './renderToCanvas';

import type { Decorator } from './public-types';

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
                    if (jestFakeTimersAreEnabled()) {
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

function jestFakeTimersAreEnabled() {
    // @ts-expect-error global jest
    if (typeof jest !== 'undefined' && jest !== null) {
        // legacy timers or modern timers
        return (setTimeout as any)._isMockFunction === true
          || Object.prototype.hasOwnProperty.call(setTimeout, 'clock');
    }

    return false;
}

export { render } from './render';
export { renderToCanvas } from './renderToCanvas';
export { applyDecorators } from './applyDecorators';
export { mount } from './mount';
