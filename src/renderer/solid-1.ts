import { global } from '@storybook/global';
import {
    createComponent,
    ErrorBoundary,
    onCleanup,
    onMount,
} from 'solid-js';
import { reconcile, createStore as solidCreateStore } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';

import { createApplyDecorators } from './shared/apply-decorators';
import { beforeAll } from './shared/before-all';
import { createDefaultRender } from './shared/default-render';
import { createMount } from './shared/mount';
import { createRenderToCanvas } from './shared/render-to-canvas';
import { createStoryState } from './shared/story-store';

import type { SolidComponent } from '../preview/public-api';
import type { SolidRendererRuntime } from './shared/render-to-canvas';

if (global.window) {
    global.window.STORYBOOK_ENV = 'solid';
}

const createStore = <T extends object>(initial: T) => {
    const [state, setStore] = solidCreateStore<T>(initial);

    const setState = (update: (prev: T) => T) => {
        setStore(reconcile(update(state)));
    };

    return [state, setState] as const;
};

const storyStore = createStoryState(createStore);

const runtime: SolidRendererRuntime = {
    storyStore,
    createComponent,
    render: solidRender,
};

const applyDecorators = createApplyDecorators({ storyStore });
const mount = createMount(runtime);
const render = createDefaultRender(runtime.createComponent);
const renderToCanvas = createRenderToCanvas({
    ...runtime,
    createStoryApp: ({ Story, storyContext, showMain, showException, storyId }) => {
        const App: SolidComponent = () => {
            onMount(() => {
                showMain();
                storyStore.setRendered(storyId, true);
            });

            onCleanup(() => {
                storyStore.setRendered(storyId, false);
            });


            if (storyContext?.parameters?.['__isPortableStory']) {
                return createComponent(() => Story(), {});
            }

            return createComponent(ErrorBoundary, {
                fallback: (err: Error) => {
                    showException(err);

                    return err as any;
                },
                children: createComponent(() => Story(), {}),
            });
        };

        return App;
    },
});

/** Preview-wide parameters for the Solid renderer. */
const parameters = {
    renderer: 'solid',
};

export {
    applyDecorators,
    beforeAll,
    mount,
    parameters,
    render,
    renderToCanvas,
};
