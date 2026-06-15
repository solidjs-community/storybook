import { getStoryId } from './story-store';

import type { Args } from 'storybook/internal/types';
import type { StoryContext, StoryFnReturnType } from '../../preview/public-api';
import type { StoryStateStore } from './story-store';

/** Play/mount API: sync reactive args and globals, then render via `renderToCanvas`. */
export function createMount({ storyStore }: { storyStore: StoryStateStore }) {
    return (context: StoryContext<Args>) => {
        const storyId = getStoryId(context);
        const { forceRemount } = context;

        if (!storyId) {
            throw new Error('Story ID is required');
        }

        return async(ui: StoryFnReturnType) => {
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

            await context.renderToCanvas();

            return context.canvas;
        };
    };
}
