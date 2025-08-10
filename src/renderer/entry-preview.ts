/* Configuration for default renderer. */
import { enhanceArgTypes } from 'storybook/internal/docs-tools';

import { solidReactivityDecorator } from './renderToCanvas';

import type { Decorator } from './public-types';
import type { ArgTypesEnhancer } from 'storybook/internal/types';

export { render } from './render';
export { renderToCanvas } from './renderToCanvas';
export { applyDecorators } from './applyDecorators';
export { mount } from './mount';

export const parameters = { renderer: 'solid' };
export const decorators: Decorator[] = [solidReactivityDecorator];
export const argTypesEnhancers: ArgTypesEnhancer[] = [enhanceArgTypes];

export const beforeAll = async() => {
    try {
        const { configure } = await import('storybook/test');

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
