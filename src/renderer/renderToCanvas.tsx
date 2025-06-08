import { ErrorBoundary, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import type { Decorator } from './public-types';

import type { ComponentsData, SolidRenderer, StoryContext } from './types';
import type { Component } from 'solid-js';
import type { RenderContext } from 'storybook/internal/types';

/**
 * SolidJS store for handling fine grained updates
 * of the components data as f.e. story args.
 */
const [store, setStore] = createStore({} as ComponentsData);

/**
 * A decorator that ensures changing args updates the story.
 */
export const solidReactivityDecorator: Decorator = (Story, context) => {
    const storyId = context.canvasElement.id;

    context.args = store[storyId]?.args || {};

    return <Story { ...context.args } />;
};

/**
 * Resets an specific story store.
 */
const cleanStoryStore = (storeId: string) => {
    setStore({ [storeId]: { args: {}, rendered: false, disposeFn: () => {} } });
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
    renderContext: RenderContext<SolidRenderer>,
    canvasElement: SolidRenderer['canvasElement']
) => {
    const { storyContext, storyFn, showMain, showException } = renderContext;

    const App: Component = () => {
        const Story = storyFn as Component<StoryContext<SolidRenderer>>;

        onMount(() => {
            showMain();
        });

        return (
            <ErrorBoundary
                fallback={ (err: any) => {
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
    renderContext: RenderContext<SolidRenderer>,
    canvasElement: SolidRenderer['canvasElement']
) {
    const { storyContext, forceRemount } = renderContext;
    const storyId = storyContext.canvasElement.id;

    // Story is remounted given the conditions
    if (forceRemount) {
        disposeStory(storyId);
        cleanStoryStore(storyId);
    }

    // Story store data is updated
    setStore(storyId, 'args', storyContext.args);

    // Story is rendered and store data is created
    if (!storyIsRendered(storyId)) {
        renderSolidApp(storyId, renderContext, canvasElement);
    }
}
