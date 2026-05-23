import {
    createComponent,
    ErrorBoundary,
    onCleanup,
    onMount,
} from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { render as solidRender } from 'solid-js/web';
import { defaultDecorateStory } from 'storybook/preview-api';

import { IS_SOLID_JSX_FLAG } from '../public-api';

import type { Args, ArgsStoryFn, Globals, LegacyStoryFn } from 'storybook/internal/types';
import type {
    Decorator,
    GlobalReactivityStore,
    RenderContext,
    SolidComponent,
    SolidRenderer,
    StoryContext,
    StoryFnReturnType,
} from '../public-api';

const [store, setStore] = createStore({} as GlobalReactivityStore);
const [globals, setGlobals] = createStore<Globals>({});

export const getStoryId = (context: { id?: string; canvasElement?: { id?: string } }): string | undefined => {
    return context.canvasElement?.id || context.id;
};

export const isStoryRendered = (storyId: string) => Boolean(store[storyId]?.rendered);

const resetStoryStore = (storyId: string) => {
    setStore({
        [storyId]: {
            args: {},
            rendered: false,
            disposeFn: null,
        },
    });
};

const setStoryValue = <K extends keyof NonNullable<GlobalReactivityStore[string]>>(
    storyId: string,
    key: K,
    value: NonNullable<GlobalReactivityStore[string]>[K]
) => {
    if (!store[storyId]) {
        resetStoryStore(storyId);
    }

    setStore(storyId, key, () => value);
};

const makeObservable = (storyId: string, context: StoryContext<Args>) => {
    setStoryValue(storyId, 'args', context.args);

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

    context.globals = globals;
    context.args = store[storyId]?.args || {};
};

const disposeStory = (storyId: string) => {
    if (store[storyId]) {
        store[storyId].disposeFn?.();
    }
};

const renderStory = (
    storyId: string,
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) => {
    const { storyContext, storyFn: StoryFn, showMain, showException } = renderContext;
    const Story = StoryFn as SolidComponent;

    if (!isStoryRendered(storyId)) {
        const App: SolidComponent = () => {
            onMount(() => {
                showMain();
                setStoryValue(storyId, 'rendered', true);
            });

            onCleanup(() => {
                setStoryValue(storyId, 'rendered', false);
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

        setStoryValue(storyId, 'disposeFn', disposeFn);
    }
    else {
        StoryFn();
    }
};

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
            disposeStory(storyId);
        }

        if (!isStoryRendered(storyId) || forceRemount) {
            resetStoryStore(storyId);
        }

        makeObservable(storyId, context);

        await context.renderToCanvas();

        return context.canvas;
    };
};

export async function renderToCanvas(
    renderContext: RenderContext,
    canvasElement: SolidRenderer['canvasElement']
) {
    const storyId = getStoryId({ ...renderContext, canvasElement });

    if (!storyId) {
        throw new Error('Story ID is required');
    }

    renderStory(storyId, renderContext, canvasElement);

    return () => {
        disposeStory(storyId);
        resetStoryStore(storyId);
    };
}

export const render: ArgsStoryFn<SolidRenderer> = (_, context) => {
    const { id, component: Component } = context;

    if (!Component) {
        throw new Error(
            `Unable to render story ${ id } as the component annotation is missing from the default export`
        );
    }

    return createComponent(Component, context.args);
};

export const applyDecorators = (
    storyFn: LegacyStoryFn<SolidRenderer>,
    _decorators: Decorator[]
): LegacyStoryFn<SolidRenderer> => {
    const decorators = _decorators.map(
        (decorator): Decorator => {
            const originalFn = (decorator as Decorator & { originalFn?: Decorator }).originalFn;
            const isJSX = Boolean(
                decorator[IS_SOLID_JSX_FLAG] || originalFn?.[IS_SOLID_JSX_FLAG]
            );

            return (StoryFn, context) => {
                if (isJSX) {
                    const storyId = getStoryId(context);

                    if (storyId && isStoryRendered(storyId)) {
                        return StoryFn(context);
                    }
                }

                return decorator(StoryFn, context);
            };
        }
    );

    return defaultDecorateStory((context) => {
        const storyId = getStoryId(context);

        if (storyId && isStoryRendered(storyId)) {
            return null;
        }

        return createComponent(storyFn, context);
    }, decorators);
};
