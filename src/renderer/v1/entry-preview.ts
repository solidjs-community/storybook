import {
    createComponent,
    ErrorBoundary,
    onCleanup,
    onMount,
} from 'solid-js';
import { reconcile, createStore as solidCreateStore } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import { createApplyDecorators } from '../shared/apply-decorators.ts';
import { createStoryState, getStoryId } from '../shared/story-store';

import type { Args } from 'storybook/internal/types';
import type { RenderContext, SolidComponent, SolidRenderer, StoryContext, StoryFnReturnType } from '../public-types';

export * from '../shared/preview-annotations';

// Story state to control rendered stories and do not remount already rendered stories
const createStore = <T extends object>(initial: T) => {
    const [state, setStore] = solidCreateStore<T>(initial);

    const setState = (update: T | ((prev: T) => T)) => {
        const next = typeof update === 'function' ? update(state) : update;

        setStore(reconcile(next));
    };

    return [state, setState] as const;
};

const storyStore = createStoryState(createStore);

/** Wraps the story fn with decorators, JSX decorators skip re-render when the story is already mounted. */
export const applyDecorators = createApplyDecorators(storyStore, createComponent);

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
        const App: SolidComponent = () => {
            onMount(() => {
                showMain();
                storyStore.setRendered(storyId, true);
            });

            onCleanup(() => {
                storyStore.setRendered(storyId, false);
            });

            if (storyContext?.parameters?.['__isPortableStory']) {
                return createComponent(Story, {});
            }

            return createComponent(ErrorBoundary, {
                fallback: (err: Error) => {
                    showException(err);

                    return err as any;
                },
                children: createComponent(Story, {}),
            });
        };

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
