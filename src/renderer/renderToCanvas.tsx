import { ErrorBoundary, onMount } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import type { Decorator, RenderContext } from './public-types';

import type { GlobalReactivityStore, SolidRenderer } from './types';
import type { Component } from 'solid-js';
import type { ArgsStoryFn, Globals } from 'storybook/internal/types';


/**
 * SolidJS store for handling fine grained updates
 * of the components data as f.e. story args.
 */
const [store, setStore] = createStore({} as GlobalReactivityStore);
const [globals, setGlobals] = createStore<Globals>({});

/**
 * Resets an specific story store.
 */
const cleanStoryStore = (storeId: string) => {
    setStore({
        [storeId]: {
            args: {},
            rendered: false,
            disposeFn: () => {},
        },
    });
};

/**
 * Disposes an specific story.
 */
const disposeStory = (storeId: string) => {
    store[storeId]?.disposeFn?.();
};


/**
 * Checks if the story store exists
 */
const storyIsRendered = (storyId: string) => Boolean(store[storyId]?.rendered);

/**
 * Renders solid App into DOM.
 */
const renderSolidApp = (
    storyId: string,
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) => {
    const { storyContext, storyFn, showMain, showException } = renderContext;
    const isPortableStory = storyContext?.parameters?.['__isPortableStory'];

    const App: Component = () => {
        const Story = storyFn;

        onMount(() => {
            showMain();
        });

        if (isPortableStory) {
            // eslint-disable-next-line solid/components-return-once
            return (
                <Story { ...storyContext } />
            );
        }

        return (
            <ErrorBoundary fallback={ (err: any) => {
                showException(err);

                return err;
            } }
            >
                <Story { ...storyContext } />
            </ErrorBoundary>
        );
    };

    const disposeFn = solidRender(() => <App />, canvasElement);

    setStore(storyId, 'disposeFn', () => disposeFn);
    setStore(storyId, 'rendered', true);
};

/**
 * A decorator that ensures changing args updates the story.
 */
export const solidReactivityDecorator: Decorator = (Story, context) => {
    const storyId = context.canvasElement.id;

    // eslint-disable-next-line solid/reactivity
    context.globals = globals;
    context.args = store[storyId]?.args || {};

    return <Story { ...context.args } />;
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
 */
export async function renderToCanvas(
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) {
    const { storyContext, forceRemount } = renderContext;
    const storyId = storyContext.canvasElement.id;

    // Story is remounted given the conditions
    if (forceRemount) {
        disposeStory(storyId);
        cleanStoryStore(storyId);
    }

    // Storybook globals are updated
    setGlobals(reconcile(storyContext.globals));

    // Story store data is updated
    setStore(storyId, 'args', storyContext.args);

    // Story is rendered and store data is created
    if (!storyIsRendered(storyId)) {
        renderSolidApp(storyId, renderContext, canvasElement);
    }
}


/**
 * Default render function for a story definition (inside a csf file) without
 * a render function. e.g:
 * ```typescript
 * export const StoryExample = {
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

    // context.args is a SolidJS proxy thanks to the solidReactivityDecorator
    return <Component { ...context.args } />;
};
