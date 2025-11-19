/* eslint-disable solid/components-return-once */
/* eslint-disable solid/reactivity */
import { ErrorBoundary, onCleanup, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import type { RenderContext, StoryContext } from './public-types';

import type { GlobalReactivityStore, SolidRenderer, StoryFnReturnType } from './types';
import type { Component } from 'solid-js';
import type { Args, ArgsStoryFn, Globals } from 'storybook/internal/types';


/**
 * SolidJS store for handling fine grained updates
 * of the components data as f.e. story args.
 */
const [store, setStore] = createStore({} as GlobalReactivityStore);
const [globals, setGlobals] = createStore<Globals>({});


/**
 * Extracts the story ID from a context object.
 */
export const getStoryId = (context: { id?: string; canvasElement?: { id?: string } }): string | undefined => {
    // Canvas element has higher priority than story ID 
    //  because we could have same story rendered on the same page but with different canvas elements
    //   e.g in autodocs
    return context.canvasElement?.id || context.id;
};

/**
 * Checks if the story store exists
 */
export const isStoryRendered = (storyId: string) => Boolean(store[storyId]?.rendered);

const _resetStoryStore = (storyId: string) => {
    setStore({
        [storyId]: {
            args: {},
            rendered: false,
            disposeFn: null,
        },
    });
};

/**
 * Helper to safely set a value on the story store.
 * Ensures the store entry exists before setting the value.
 */
const _setStoryValue = <K extends keyof NonNullable<GlobalReactivityStore[string]>>(
    storyId: string,
    key: K,
    value: NonNullable<GlobalReactivityStore[string]>[K]
) => {
    if (!store[storyId]) {
        _resetStoryStore(storyId);
    }

    setStore(storyId, key, () => value);
};

/**
 * Updates the reactive args for the story.
 */
const _makeObservable = (storyId: string, context: StoryContext<Args>) => {
    _setStoryValue(storyId, 'args', context.args);

    // Update globals as well
    setGlobals(produce((state) => {
        Object.keys(context.globals).forEach((key) => {
            state[key] = context.globals[key];
        });

        Object.keys(state).forEach((key) => {
            if (!context.globals[key]) {
                delete state[key];
            }
        });

        return state;
    }));

    // Put the ref to observed globals and args back into the context
    context.globals = globals;
    context.args = store[storyId]?.args || {};
};

/**
 * Disposes an specific story.
 */
const _disposeStory = (storyId: string) => {
    if (store[storyId]) {
        store[storyId].disposeFn?.();
    }
};

/**
 * Renders solid App into DOM.
 */
const _renderStory = (
    storyId: string,
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) => {
    const { storyContext, storyFn: StoryFn, showMain, showException } = renderContext;

    // Story is rendered and store data is created
    if (!isStoryRendered(storyId)) {
        const App: Component = () => {
            onMount(() => {
                showMain();
                _setStoryValue(storyId, 'rendered', true);
            });

            onCleanup(() => {
                _setStoryValue(storyId, 'rendered', false);
            });

            if (storyContext?.parameters?.['__isPortableStory']) {
                return <StoryFn />;
            }

            return (
                <ErrorBoundary fallback={ (err: any) => {
                    showException(err);

                    return err;
                } }
                >
                    <StoryFn />
                </ErrorBoundary>
            );
        };

        const disposeFn = solidRender(() => <App />, canvasElement);

        _setStoryValue(storyId, 'disposeFn', disposeFn);
    }
    // The story is already rendered, but we need to re-run the story function
    // to pick up changes in decorators and global settings (like the measure tool).
    // Here, StoryFn its a chain of decorators which works like a React component, which re-renders each time something updates.
    // Thanks to the applyDecorators function, story/decorator functions are not re-run if the story is already rendered and contains JSX.
    else {
        StoryFn();
    }
};

/**
 * Mount function for mounting the story to the canvas.
 * Called each time component should be mounted or updated.
 */
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

        // Story should be force remounted
        if (forceRemount) {
            _disposeStory(storyId);
        }

        // Reset story store if story is not rendered or should be remounted
        if (!isStoryRendered(storyId) || forceRemount) {
            _resetStoryStore(storyId);
        }

        // Update reactive args and globals and put observed globals and args back into the context
        _makeObservable(storyId, context);

        // Call internal renderToCanvas function
        //  which later calls renderToCanvas defined below
        await context.renderToCanvas();

        return context.canvas;
    };
};


/**
 * Main renderer function for initializing the SolidJS app with the story content.
 *
 * How this works is a bit different from the React renderer.
 * In React, components run again on rerender so the React renderer just recalls the component,
 * but Solid has fine-grained reactivity so components run once,
 * and when dependencies are updated, effects/tracking scopes run again.
 *
 * So, we can store args in a store and just update the store when this function is called.
 * However, we also need to re-run the story function to pick up changes in decorators
 * and global settings, similar to how the Vue renderer handles this.
 */
export async function renderToCanvas(
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) {
    const storyId = getStoryId({ ...renderContext, canvasElement });

    if (!storyId) {
        throw new Error('Story ID is required');
    }

    // Render story
    _renderStory(storyId, renderContext, canvasElement);

    // Story was closed
    return () => {
        _disposeStory(storyId);
        _resetStoryStore(storyId);
    };
}


/**
 * Default render function for a story definition (inside a csf file) without
 * a render function. e.g:
 * ```typescript
 * export const StoryExample = {
 *  component: Button,
 *  args: {
 *    disabled: true,
 *    children: "Hello World",
 *  },
 * };
 * ```
 */
export const render: ArgsStoryFn<SolidRenderer> = (_, context) => {
    const { id, component: Component } = context;

    if (!Component) {
        throw new Error(
            `Unable to render story ${ id } as the component annotation is missing from the default export`
        );
    }

    return <Component { ...context.args } />;
};
