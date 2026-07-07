import { describe, expect, it } from 'vitest';

import { createMount } from '../../renderer/shared/mount';
import { createTestStoryStore } from '../helpers/rendererTestKit';

describe('createMount', () => {
    it('throws when the story context has no id', () => {
        const mount = createMount({ storyStore: createTestStoryStore() });

        expect(() => mount({} as any)).toThrow('Story ID is required');
    });

    it('disposes and resets an already rendered story when forceRemount is set', async() => {
        const storyStore = createTestStoryStore();
        let disposed = false;

        storyStore.setRendered('button--primary', true);
        storyStore.setDisposeFn('button--primary', () => {
            disposed = true;
        });

        let renderToCanvasCalls = 0;
        const context = {
            id: 'button--primary',
            forceRemount: true,
            renderToCanvas: async() => {
                renderToCanvasCalls += 1;
            },
            canvas: 'canvas',
        } as any;
        const mount = createMount({ storyStore });

        await expect(mount(context)()).resolves.toBe('canvas');

        expect(disposed).toBe(true);
        expect(storyStore.isStoryRendered('button--primary')).toBe(false);
        expect(renderToCanvasCalls).toBe(1);
    });

    it('does not reset an already rendered story without forceRemount', async() => {
        const storyStore = createTestStoryStore();

        storyStore.setRendered('button--primary', true);

        const context = {
            id: 'button--primary',
            forceRemount: false,
            renderToCanvas: async() => undefined,
            canvas: 'canvas',
        } as any;
        const mount = createMount({ storyStore });

        await mount(context)();

        expect(storyStore.isStoryRendered('button--primary')).toBe(true);
    });

    it('overrides originalStoryFn when mount receives UI', async() => {
        const storyStore = createTestStoryStore();
        const context = {
            id: 'button--primary',
            forceRemount: false,
            renderToCanvas: async() => undefined,
            canvas: 'canvas',
            originalStoryFn: () => 'original',
        } as any;
        const mount = createMount({ storyStore });

        await mount(context)('mounted-ui');

        expect(context.originalStoryFn()).toBe('mounted-ui');
    });
});
