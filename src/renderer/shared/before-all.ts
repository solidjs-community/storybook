import { configure } from 'storybook/test';

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
