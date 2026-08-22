import { describe, expect, it } from 'vitest';

import { IS_SOLID_JSX_FLAG } from '../../preview/public-api';
import { createApplyDecorators } from '../../renderer/shared/apply-decorators';
import { createTestStoryStore } from '../helpers/rendererTestKit';

describe('createApplyDecorators', () => {
    it('skips JSX decorators after the story has mounted', () => {
        const storyStore = createTestStoryStore();

        storyStore.setRendered('button--primary', true);

        let jsxDecoratorRuns = 0;
        const jsxDecorator = (StoryFn: typeof storyFn, context: { id?: string }) => {
            jsxDecoratorRuns += 1;

            return `decorated:${ context.id }:${ StoryFn(context) }`;
        };

        jsxDecorator[IS_SOLID_JSX_FLAG] = true;

        const storyFn = (context: { id?: string }) => `story:${ context.id }`;
        const applyDecorators = createApplyDecorators({ storyStore });
        const decoratedStory = applyDecorators(storyFn as any, [jsxDecorator as any]);

        expect(decoratedStory({ id: 'button--primary' } as any)).toBeNull();
        expect(jsxDecoratorRuns).toBe(0);
    });

    it('runs JSX decorators on the initial mount', () => {
        const storyStore = createTestStoryStore();

        const jsxDecorator = (StoryFn: typeof storyFn, context: { id?: string }) => (
            `decorated:${ StoryFn(context) }`
        );

        jsxDecorator[IS_SOLID_JSX_FLAG] = true;

        const storyFn = (context: { id?: string }) => `story:${ context.id }`;
        const applyDecorators = createApplyDecorators({ storyStore });
        const decoratedStory = applyDecorators(storyFn as any, [jsxDecorator as any]);

        expect(decoratedStory({ id: 'button--primary' } as any)).toBe('decorated:story:button--primary');
    });

    it('respects the JSX flag on Storybook-wrapped decorators', () => {
        const storyStore = createTestStoryStore();

        storyStore.setRendered('button--primary', true);

        const originalDecorator = (StoryFn: typeof storyFn, context: { id?: string }) => (
            `decorated:${ StoryFn(context) }`
        );

        originalDecorator[IS_SOLID_JSX_FLAG] = true;

        let wrappedDecoratorRuns = 0;
        const wrappedDecorator = (StoryFn: typeof storyFn, context: { id?: string }) => {
            wrappedDecoratorRuns += 1;

            return originalDecorator(StoryFn, context);
        };

        (wrappedDecorator as typeof wrappedDecorator & { originalFn: typeof originalDecorator }).originalFn = originalDecorator;

        const storyFn = (context: { id?: string }) => `story:${ context.id }`;
        const applyDecorators = createApplyDecorators({ storyStore });
        const decoratedStory = applyDecorators(storyFn, [wrappedDecorator as any]);

        expect(decoratedStory({ id: 'button--primary' } as any)).toBeNull();
        expect(wrappedDecoratorRuns).toBe(0);
    });

    it('still runs non-JSX decorators after mount, but skips re-rendering the story fn', () => {
        const storyStore = createTestStoryStore();

        storyStore.setRendered('button--primary', true);

        let decoratorRuns = 0;
        const decorator = (StoryFn: typeof storyFn, context: { id?: string }) => {
            decoratorRuns += 1;

            return `decorated:${ StoryFn(context) }`;
        };

        const storyFn = (context: { id?: string }) => `story:${ context.id }`;
        const applyDecorators = createApplyDecorators({ storyStore });
        const decoratedStory = applyDecorators(storyFn as any, [decorator as any]);

        expect(decoratedStory({ id: 'button--primary' } as any)).toBe('decorated:null');
        expect(decoratorRuns).toBe(1);
    });
});
