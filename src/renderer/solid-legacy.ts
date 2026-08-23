import { global } from '@storybook/global';
import {
    createComponent,
    ErrorBoundary,
    onCleanup,
    onMount,
} from 'solid-js-legacy';
import { reconcile, createStore as solidCreateStore } from 'solid-js-legacy/store';
import { render as solidRender } from 'solid-js-legacy/web';
import { definePreviewAddon } from 'storybook/internal/csf';

import { createApplyDecorators } from './shared/apply-decorators';
import { beforeAll } from './shared/before-all';
import { createDefaultRender } from './shared/default-render';
import { createMount } from './shared/mount';
import { createRenderToCanvas } from './shared/render-to-canvas';
import { createStoryState } from './shared/story-store';

import type { ProjectAnnotations, Renderer } from 'storybook/internal/types';
import type { SolidComponent } from '../preview/public-api';
import type { SolidRendererRuntime } from './shared/render-to-canvas';

const SOLID_RENDERER_ID = 'solid' as const;

if (global.window) {
    global.window.STORYBOOK_ENV = SOLID_RENDERER_ID;
}

const parameters = {
    renderer: SOLID_RENDERER_ID,
};

function createStore<T extends object>(initial: T) {
    const [state, setStore] = solidCreateStore<T>(initial);

    const setState = (update: (prev: T) => T) => {
        setStore(reconcile(update(state)));
    };

    return [state, setState] as const;
}

const storyStore = createStoryState(createStore);

const runtime: SolidRendererRuntime = {
    storyStore,
    createComponent: createComponent as SolidRendererRuntime['createComponent'],
    render: solidRender as SolidRendererRuntime['render'],
};

const applyDecorators = createApplyDecorators({ storyStore });
const mount = createMount(runtime);
const render = createDefaultRender(runtime.createComponent);
const renderToCanvas = createRenderToCanvas({
    ...runtime,
    createStoryApp: ({ Story, showMain, showException, storyId }) => {
        const App: SolidComponent = () => {
            onMount(() => {
                showMain();
                storyStore.setRendered(storyId, true);
            });

            onCleanup(() => {
                storyStore.setRendered(storyId, false);
            });

            return createComponent(ErrorBoundary as any, {
                fallback: (err: Error) => {
                    showException(err);

                    return err as any;
                },
                children: createComponent((() => Story()) as any, {}),
            });
        };

        return App;
    },
});

const previewAddon = definePreviewAddon({
    applyDecorators,
    beforeAll,
    mount,
    parameters,
    render,
    renderToCanvas,
} as unknown as ProjectAnnotations<Renderer>);

export {
    applyDecorators,
    beforeAll,
    mount,
    parameters,
    previewAddon,
    render,
    renderToCanvas
};
