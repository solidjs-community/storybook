import { describe, expect, it } from 'vitest';

import { createRenderToCanvas } from '../../renderer/shared/render-to-canvas';
import { createTestStoryStore } from '../helpers/rendererTestKit';

describe('createRenderToCanvas', () => {
    it('throws when the render context has no story id', async() => {
        const renderToCanvas = createRenderToCanvas({
            storyStore: createTestStoryStore(),
            createComponent: () => null,
            render: () => () => undefined,
            createStoryApp: () => () => null,
        });

        await expect(renderToCanvas({ storyContext: {} } as any, {} as any)).rejects.toThrow(
            'Story ID is required'
        );
    });

    it('mounts once, then updates via StoryFn when the story is already rendered', async() => {
        const storyStore = createTestStoryStore();
        let mountCount = 0;
        let storyUpdateCount = 0;
        const StoryFn = () => {
            storyUpdateCount += 1;
        };

        const renderToCanvas = createRenderToCanvas({
            storyStore,
            createComponent: component => component,
            render: (renderFn) => {
                mountCount += 1;
                renderFn();

                return () => undefined;
            },
            createStoryApp: ({ Story }) => () => Story(),
        });

        await renderToCanvas({
            id: 'button--primary',
            storyContext: {},
            storyFn: StoryFn,
            showMain: () => undefined,
            showException: () => undefined,
        } as any, {} as any);

        expect(mountCount).toBe(1);
        expect(storyUpdateCount).toBe(0);

        storyStore.setRendered('button--primary', true);

        await renderToCanvas({
            id: 'button--primary',
            storyContext: {},
            storyFn: StoryFn,
            showMain: () => undefined,
            showException: () => undefined,
        } as any, {} as any);

        expect(mountCount).toBe(1);
        expect(storyUpdateCount).toBe(1);
    });

    it('disposes the Solid tree and resets story state on cleanup', async() => {
        const storyStore = createTestStoryStore();
        let disposed = false;
        const renderToCanvas = createRenderToCanvas({
            storyStore,
            createComponent: component => component,
            render: () => () => {
                disposed = true;
            },
            createStoryApp: () => () => null,
        });

        const cleanup = await renderToCanvas({
            id: 'button--primary',
            storyContext: {},
            storyFn: () => undefined,
            showMain: () => undefined,
            showException: () => undefined,
        } as any, {} as any);

        cleanup();

        expect(disposed).toBe(true);
        expect(storyStore.isStoryRendered('button--primary')).toBe(false);
    });
});
