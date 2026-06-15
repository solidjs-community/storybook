import { defaultDecorateStory } from 'storybook/preview-api';

import { IS_SOLID_JSX_FLAG, type Decorator, type SolidRenderer } from '../../preview/public-api';
import { getStoryId } from './story-store';

import type { LegacyStoryFn } from 'storybook/internal/types';
import type { StoryStateStore } from './story-store';

export function createApplyDecorators({
    storyStore,
}: {
    storyStore: StoryStateStore;
}): (
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

                        if (storyId && storyStore.isStoryRendered(storyId)) {
                            return StoryFn(context);
                        }
                    }

                    return decorator(StoryFn, context);
                };
            }
        );

        return defaultDecorateStory((context) => {
            const storyId = getStoryId(context);

            if (storyId && storyStore.isStoryRendered(storyId)) {
                return null;
            }

            return storyFn(context);
        }, decorators);
    };
}
