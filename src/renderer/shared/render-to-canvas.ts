import { getStoryId } from './story-store';

import type { RenderContext, SolidComponent, SolidRenderer } from '../../preview/public-api';
import type { StoryStateStore } from './story-store';

export type SolidRuntimeCreateComponent = (
    component: SolidComponent,
    props: object
) => SolidRenderer['storyResult'];

export type SolidRendererRuntime = {
    storyStore: StoryStateStore;
    createComponent: SolidRuntimeCreateComponent;
    render: (
        renderFn: () => SolidRenderer['storyResult'],
        canvasElement: SolidRenderer['canvasElement']
    ) => () => void;
};

export type StoryThunk = () => SolidRenderer['storyResult'];

export type StoryAppContext = {
    Story: StoryThunk;
    storyContext: RenderContext['storyContext'];
    showMain: RenderContext['showMain'];
    showException: RenderContext['showException'];
    storyId: string;
};

type RenderToCanvasOptions = SolidRendererRuntime & {
    createStoryApp: (context: StoryAppContext) => SolidComponent;
};

/** Mounts or updates the story in the preview canvas. Returns cleanup when the story changes. */
export function createRenderToCanvas(options: RenderToCanvasOptions) {
    const { storyStore, createComponent, render, createStoryApp } = options;

    return async(
        renderContext: RenderContext,
        canvasElement: SolidRenderer['canvasElement']
    ) => {
        const storyId = getStoryId({ ...renderContext, canvasElement });

        if (!storyId) {
            throw new Error('Story ID is required');
        }

        const { storyContext, storyFn: StoryFn, showMain, showException } = renderContext;

        if (!storyStore.isStoryRendered(storyId)) {
            const App = createStoryApp({
                Story: StoryFn,
                storyContext,
                showMain,
                showException,
                storyId,
            });

            const disposeFn = render(() => createComponent(App, {}), canvasElement);

            storyStore.setDisposeFn(storyId, disposeFn);
        }
        else {
            StoryFn();
        }

        return () => {
            storyStore.disposeStory(storyId);
            storyStore.resetStory(storyId);
        };
    };
}
