import { defaultDecorateStory } from 'storybook/preview-api';

import { IS_SOLID_JSX_FLAG } from './public-types';
import { getStoryId } from './story-store';

import type { Args, StoryContext as InternalStoryContext, LegacyStoryFn } from 'storybook/internal/types';
import type {
    Decorator,
    SolidRenderer,
} from './public-types';
import type { StoryStateStore } from './story-store';

export function createApplyDecorators(
    store: StoryStateStore,
    createComponent: (
        storyFn: LegacyStoryFn<SolidRenderer>,
        context: InternalStoryContext<SolidRenderer, Args>
    ) => SolidRenderer['storyResult']
): (
    storyFn: LegacyStoryFn<SolidRenderer>,
    rawDecorators: Decorator[]
) => LegacyStoryFn<SolidRenderer> {
    return (storyFn, rawDecorators) => {
        const decorators = rawDecorators.map(
            (decorator): Decorator => {
                const originalFn = (decorator as Decorator & { originalFn?: Decorator }).originalFn;
                const isJSX = Boolean(
                    decorator[IS_SOLID_JSX_FLAG] || originalFn?.[IS_SOLID_JSX_FLAG]
                );

                return (StoryFn, context) => {
                    if (isJSX) {
                        const storyId = getStoryId(context);

                        if (storyId && store.isStoryRendered(storyId)) {
                            return StoryFn(context);
                        }
                    }

                    return decorator(StoryFn, context);
                };
            }
        );

        return defaultDecorateStory((context) => {
            const storyId = getStoryId(context);

            if (storyId && store.isStoryRendered(storyId)) {
                return null;
            }

            return createComponent(storyFn, context);
        }, decorators);
    };
}
