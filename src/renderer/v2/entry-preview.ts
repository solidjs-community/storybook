import { render as solidRender } from '@solidjs/web';
import {
    createComponent,
    Errored,
    onSettled,
    createStore as solidCreateStore,
} from 'solid-js-v2';

import { createApplyDecorators } from '../shared/apply-decorators.ts';
import { createStoryState, getStoryId } from '../shared/story-store';

import type { Args } from 'storybook/internal/types';
import type { RenderContext, SolidComponent, SolidRenderer, StoryContext, StoryFnReturnType } from './public-types';

export * from '../shared/preview-annotations';

const createStore = <T extends object>(initial: T) => {
    const [state, setStore] = solidCreateStore(initial as any);

    const setState = (update: (prev: T) => T) => {
        setStore(() => update(state as unknown as T));
    };

    return [state as T, setState] as const;
};

const storyStore = createStoryState(createStore);

/** Wraps the story fn with decorators, JSX decorators skip re-render when the story is already mounted. */
export const applyDecorators = createApplyDecorators(
    storyStore,
    createComponent as Parameters<typeof createApplyDecorators>[1]
);

/** Mounts or updates the story in the preview canvas. Returns cleanup when the story changes. */
export const renderToCanvas = async(
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) => {
    const storyId = getStoryId({ ...renderContext, canvasElement });

    if (!storyId) {
        throw new Error('Story ID is required');
    }

    const { storyContext, storyFn: StoryFn, showMain, showException } = renderContext;
    const Story = StoryFn as SolidComponent;

    if (!storyStore.isStoryRendered(storyId)) {
        const App = (() => {
            onSettled(() => {
                showMain();
                storyStore.setRendered(storyId, true);

                return () => {
                    storyStore.setRendered(storyId, false);
                };
            });

            if (storyContext?.parameters?.['__isPortableStory']) {
                return createComponent(Story, {});
            }

            return createComponent(Errored, {
                fallback: (err: () => unknown, _reset: () => void) => {
                    const error = err() as Error;

                    showException(error);

                    return error as any;
                },
                children: createComponent(Story, {}),
            });
        }) as SolidComponent;

        const disposeFn = solidRender(() => createComponent(App, {}), canvasElement);

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

/** Play/mount API: sync reactive args and globals, then render via `renderToCanvas`. */
export const mount = (context: StoryContext<Args>) => {
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
