import { render as solidRender } from '@solidjs/web';
import { global } from '@storybook/global';
import {
    createComponent,
    createMemo,
    createStore,
    Errored,
    onSettled,
} from 'solid-js-next';

import { createApplyDecorators } from './shared/apply-decorators';
import { beforeAll } from './shared/before-all';
import { createDefaultRender } from './shared/default-render';
import { createMount } from './shared/mount';
import { createRenderToCanvas } from './shared/render-to-canvas';
import { createStoryState } from './shared/story-store';

import type { SolidComponent, SolidRenderer } from '../preview/public-api';
import type { SolidRendererRuntime, StoryThunk } from './shared/render-to-canvas';

if (global.window) {
    global.window.STORYBOOK_ENV = 'solid';
}

function trackStory(story: StoryThunk): SolidRenderer['storyResult'] {
    return createMemo(story) as unknown as SolidRenderer['storyResult'];
}

const storyStore = createStoryState((initial: any) => {
    const [state, setStore] = createStore(initial);

    const setState = (update: (prev: any) => any) => {
        setStore(() => update(state));
    };

    return [state, setState];
});

const runtime: SolidRendererRuntime = {
    storyStore,
    render: solidRender,
    createComponent: createComponent as SolidRendererRuntime['createComponent'],
};

const applyDecorators = createApplyDecorators({ storyStore });
const mount = createMount(runtime);
const render = createDefaultRender(runtime.createComponent);
const renderToCanvas = createRenderToCanvas({
    ...runtime,
    createStoryApp: ({ Story, storyContext, showMain, showException, storyId }) => {
        const renderStory = () => createComponent(() => trackStory(Story), {});

        return (() => {
            onSettled(() => {
                showMain();
                storyStore.setRendered(storyId, true);

                return () => {
                    storyStore.setRendered(storyId, false);
                };
            });


            if (storyContext?.parameters?.['__isPortableStory']) {
                return renderStory();
            }

            return createComponent(Errored, {
                fallback: (err: () => unknown, _reset: () => void) => {
                    const error = err() as Error;

                    showException(error);

                    return error as any;
                },
                children: renderStory(),
            });
        }) as SolidComponent;
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
