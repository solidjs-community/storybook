import { getStoryId } from './story-store';

import type { Args } from 'storybook/internal/types';
import type { StoryContext, StoryFnReturnType } from '../../preview/public-api';
import type { StoryStateStore } from './story-store';

/** Play/mount API: sync reactive args and globals, then render via `renderToCanvas`. */
export function createMount({
    storyStore,
    flush,
}: {
    storyStore: StoryStateStore;
    /**
     * Solid 2 commits store writes on `flush`. Call it once, after both args
     * and globals are updated, so a new reader does not observe the empty store.
     */
    flush?: () => void;
}) {
    return (context: StoryContext<Args>) => {
        const storyId = getStoryId(context);
        const { forceRemount } = context;

        if (!storyId) {
            throw new Error('Story ID is required');
        }

        return async(ui?: StoryFnReturnType) => {
            if (ui != null) {
                context.originalStoryFn = () => ui;
            }

            if (forceRemount) {
                storyStore.disposeStory(storyId);
            }

            if (!storyStore.isStoryRendered(storyId) || forceRemount) {
                storyStore.resetStory(storyId);
            }

            storyStore.makeContextReactive(context);
            flush?.();

            await context.renderToCanvas();

            return context.canvas;
        };
    };
}
