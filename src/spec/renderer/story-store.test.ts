import { describe, expect, it } from 'vitest';

import { createStoryState, getStoryId } from '../../renderer/shared/story-store';
import { createLegacyStyleStore, createTestStoryStore } from '../helpers/rendererTestKit';

describe('getStoryId', () => {
    it('uses context id when canvas id is missing', () => {
        expect(getStoryId({ id: 'button--primary' })).toBe('button--primary');
    });

    it('uses context id when canvas id is storybook-root', () => {
        expect(getStoryId({
            id: 'button--primary',
            canvasElement: { id: 'storybook-root' },
        })).toBe('button--primary');
    });

    it('prefers canvas element id for multi-canvas previews', () => {
        expect(getStoryId({
            id: 'button--primary',
            canvasElement: { id: 'docs-canvas-0' },
        })).toBe('docs-canvas-0');
    });
});

describe('createStoryState', () => {
    it('tracks rendered stories and clears them on reset', () => {
        const store = createTestStoryStore();

        expect(store.isStoryRendered('button--primary')).toBe(false);

        store.setRendered('button--primary', true);
        expect(store.isStoryRendered('button--primary')).toBe(true);

        store.setRendered('button--primary', false);
        expect(store.isStoryRendered('button--primary')).toBe(false);

        store.resetStory('button--primary');
        expect(store.isStoryRendered('button--primary')).toBe(false);
    });

    it('runs and clears dispose callbacks', () => {
        const store = createTestStoryStore();
        let disposed = false;

        store.setDisposeFn('button--primary', () => {
            disposed = true;
        });
        store.disposeStory('button--primary');

        expect(disposed).toBe(true);

        disposed = false;
        store.disposeStory('button--primary');
        expect(disposed).toBe(false);
    });

    it('requires a story id when making context reactive', () => {
        const store = createTestStoryStore();

        expect(() => store.makeContextReactive({ args: {}, globals: {} } as any)).toThrow(
            'Story ID is required'
        );
    });

    it('binds context args and globals to reactive stores', () => {
        const store = createStoryState(createLegacyStyleStore);
        const context = {
            id: 'button--primary',
            args: { label: 'Click me' },
            globals: { theme: 'dark' },
        } as any;

        store.makeContextReactive(context);

        expect(context.args).toEqual({ label: 'Click me' });
        expect(context.globals).toEqual({ theme: 'dark' });

        context.args = { label: 'Updated' };
        context.globals = { theme: 'light' };

        store.makeContextReactive(context);

        expect(context.args).toEqual({ label: 'Updated' });
        expect(context.globals).toEqual({ theme: 'light' });
    });

    it('reuses the same args store for a story across updates', () => {
        const store = createTestStoryStore();
        const context = {
            id: 'button--primary',
            args: { label: 'First' },
            globals: {},
        } as any;

        store.makeContextReactive(context);
        const firstArgsRef = context.args;

        context.args = { label: 'Second' };
        store.makeContextReactive(context);

        expect(context.args).toBe(firstArgsRef);
        expect(context.args).toEqual({ label: 'Second' });
    });

    it('creates a fresh args store after resetStory', () => {
        const store = createTestStoryStore();
        const context = {
            id: 'button--primary',
            args: { label: 'First' },
            globals: {},
        } as any;

        store.makeContextReactive(context);
        const firstArgsRef = context.args;

        store.resetStory('button--primary');

        context.args = { label: 'After reset' };
        store.makeContextReactive(context);

        expect(context.args).not.toBe(firstArgsRef);
        expect(context.args).toEqual({ label: 'After reset' });
    });
});
