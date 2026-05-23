import { global } from '@storybook/global';
import { createComponent } from 'solid-js';
import { configure } from 'storybook/test';

import type { ArgsStoryFn } from 'storybook/internal/types';
import type { SolidRenderer } from '../public-types';

if (global.window) {
    global.window.STORYBOOK_ENV = 'solid';
}

/** Preview-wide parameters for the Solid renderer. */
export const parameters = {
    renderer: 'solid',
};

/** Default render for meta/stories with `component` + `args` and no custom `render` (CSF 3+). */
export const render: ArgsStoryFn<SolidRenderer> = (_, context) => {
    if (!context.component) {
        throw new Error(
            `Unable to render story ${ context.id } as the component annotation is missing from the default export`
        );
    }

    return createComponent(context.component, context.args);
};

/** Configures `storybook/test` wrappers so Solid updates flush after async play steps. */
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
