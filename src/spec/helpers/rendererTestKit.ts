import { reconcile, createStore as solidCreateStore } from 'solid-js/store';

import { createStoryState } from '../../renderer/shared/story-store';

/** Matches the legacy renderer store adapter (reconcile on update). */
export function createLegacyStyleStore<T extends object>(initial: T) {
    const [state, setStore] = solidCreateStore<T>(initial);

    const setState = (update: (prev: T) => T) => {
        setStore(reconcile(update(state)));
    };

    return [state, setState] as const;
}

export function createTestStoryStore() {
    return createStoryState(createLegacyStyleStore);
}
