import type { Args, Globals, StoryContext as InternalStoryContext } from 'storybook/internal/types';
import type { SolidRenderer } from './public-types';

/** Update store via `(prev) => next` (version layer applies reconcile/draft setter). */
type SetStoreFn<T extends object> = (update: (prev: T) => T) => void;

/** Reactive store tuple returned by `createStore` (state + setter). */
type SolidStore<T extends object> = readonly [
    state: T,
    setState: SetStoreFn<T>
];

type CreateStoreFn = <T extends object>(initial: T) => SolidStore<T>;

export interface StoryStateStore {
    isStoryRendered: (storyId: string) => boolean;
    resetStory: (storyId: string) => void;
    setRendered: (storyId: string, rendered: boolean) => void;
    setDisposeFn: (storyId: string, disposeFn: (() => void) | null) => void;
    makeContextReactive: (context: InternalStoryContext<SolidRenderer, Args>) => void;
    disposeStory: (storyId: string) => void;
}

export const getStoryId = (context: { id?: string; canvasElement?: { id?: string } }): string | undefined => {
    const canvasId = context.canvasElement?.id;

    if (!canvasId || canvasId === 'storybook-root') {
        return context.id;
    }

    return canvasId;
};

export function createStoryState(createStore: CreateStoreFn): StoryStateStore {
    const [globals, setGlobals] = createStore<Globals>({});
    const renderedStories = new Set<string>();
    const argsStores = new Map<string, SolidStore<Args>>();
    const disposers = new Map<string, () => void>();

    const getArgsStore = (storyId: string): SolidStore<Args> => {
        let store = argsStores.get(storyId);

        if (!store) {
            store = createStore({} as Args);
            argsStores.set(storyId, store);
        }

        return store;
    };

    return {
        isStoryRendered(storyId) {
            return renderedStories.has(storyId);
        },

        resetStory(storyId) {
            renderedStories.delete(storyId);
            disposers.delete(storyId);
            argsStores.delete(storyId);
        },

        setRendered(storyId, isRendered) {
            if (isRendered) {
                renderedStories.add(storyId);
            }
            else {
                renderedStories.delete(storyId);
            }
        },

        setDisposeFn(storyId, disposeFn) {
            if (disposeFn) {
                disposers.set(storyId, disposeFn);
            }
            else {
                disposers.delete(storyId);
            }
        },

        makeContextReactive(context) {
            const storyId = getStoryId(context);

            if (!storyId) {
                throw new Error('Story ID is required');
            }

            const [args, setArgs] = getArgsStore(storyId);

            // Update reactive stores with the new values
            setArgs(() => context.args);
            setGlobals(() => context.globals);

            // Sync the reactive stores to the context
            context.args = args;
            context.globals = globals;
        },

        disposeStory(storyId) {
            disposers.get(storyId)?.();
            disposers.delete(storyId);
        },
    };
}
