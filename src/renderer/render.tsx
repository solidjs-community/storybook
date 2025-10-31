/* eslint-disable solid/components-return-once */
/* eslint-disable solid/reactivity */
import { ErrorBoundary, onMount } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import type { Decorator, RenderContext } from './public-types';

import type { GlobalReactivityStore, SolidRenderer, StoryContext, StoryFnReturnType } from './types';
import type { Component } from 'solid-js';
import type { Args, ArgsStoryFn, Globals } from 'storybook/internal/types';


/**
 * SolidJS store for handling fine grained updates
 * of the components data as f.e. story args.
 */
const [store, setStore] = createStore({} as GlobalReactivityStore);
const [globals, setGlobals] = createStore<Globals>({});

/**
 * Checks if the story store exists
 */
const _isStoryRendered = (storyId: string) => Boolean(store[storyId]?.rendered);

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
const _updateReactiveArgs = (storyId: string, context: StoryContext<Args>) => {
    const { args, globals } = context;

    _setStoryValue(storyId, 'args', args);

    // Update globals as well
    setGlobals(produce((state) => {
        Object.keys(globals).forEach((key) => {
            state[key] = globals[key];
        });

        Object.keys(state).forEach((key) => {
            if (!globals[key]) {
                delete state[key];
            }
        });

        return state;
    }));
};

/**
 * A decorator that ensures changing args updates the story.
 */
export const solidReactivityDecorator: Decorator = (Story, context) => {
    const storyId = context.id || context.canvasElement?.id;

    // Ignore rerendering the story if it's already rendered
    if (_isStoryRendered(storyId)) {
        return;
    }

    context.globals = globals;
    context.args = store[storyId]?.args || {};

    return <Story { ...context.args } />;
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
    const { storyContext, storyFn: Story, showMain, showException } = renderContext;

    // Story is rendered and store data is created
    if (!_isStoryRendered(storyId)) {
        const App: Component = () => {
            onMount(() => {
                showMain();
            });

            if (storyContext?.parameters?.['__isPortableStory']) {
                return <Story />;
            }

            const onError = (err: any) => {
                showException(err);

                return err;
            };

            return (
                <ErrorBoundary fallback={ onError }>
                    <Story />
                </ErrorBoundary>
            );
        };

        const disposeFn = solidRender(() => <App />, canvasElement);

        _setStoryValue(storyId, 'disposeFn', disposeFn);
        _setStoryValue(storyId, 'rendered', true);
    }
    // Story is already rendered, but we need to re-run the story function
    // to pick up changes in decorators and global settings (like measure tool)
    // StoryFn here its `like React` component which render whole document with all decorators so we must re-run it every time something updates
    // Thank to reactivity decorator which won't run any real user code/decorators for this rerenders
    else {
        Story();
    }
};

/**
 * Mount function for mounting the story to the canvas.
 * Called each time component should be mounted or updated.
 */
export const mount = (context: StoryContext<Args>) => {
    const storyId = context.id || context.canvasElement?.id;
    const { forceRemount } = context;

    return async(ui: StoryFnReturnType) => {
        if (ui != null) {
            context.originalStoryFn = () => ui;
        }

        // Story should be force remounted
        if (forceRemount) {
            _disposeStory(storyId);
        }

        // Reset story store if story is not rendered or should be remounted
        if (!_isStoryRendered(storyId) || forceRemount) {
            _resetStoryStore(storyId);
        }

        // Update reactive args and globals
        _updateReactiveArgs(storyId, context);

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
    const storyId = renderContext.id || canvasElement?.id;

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
