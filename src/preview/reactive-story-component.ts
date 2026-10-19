import * as solid from 'solid-js';
import { composeStory } from 'storybook/preview-api';

import type { ProjectAnnotations } from 'storybook/internal/types';

/**
 * `__compose()` copies props with an object spread before the story function
 * runs. The only hook between that copy and the story is a decorator, so this
 * one puts the original props object back onto `context.args`. Solid's
 * `mergeProps` / `merge` keeps the getters. The story then renders once.
 */

interface ComposableStory {
    input: {
        decorators?: unknown;
    };
    meta: {
        input: Record<string, unknown>;
        preview: {
            composed: ProjectAnnotations<any>;
        };
    };
}

type MergeArgs = (base: object, props: object) => object;

const mergeArgs: MergeArgs = 'mergeProps' in solid
    ? solid.mergeProps
    : (solid as { merge: MergeArgs }).merge;

function toArray(decorators: unknown): any[] {
    if (decorators == null) {
        return [];
    }

    return Array.isArray(decorators) ? decorators : [decorators];
}

export function createReactiveStoryComponent(story: ComposableStory) {
    let liveProps: object | undefined;

    const composed = composeStory(
        {
            ...story.input,
            decorators: [
                (storyFn: (context: { args: object }) => unknown, context: { args?: object }) => {
                    if (liveProps) {
                        context.args = mergeArgs(context.args ?? {}, liveProps);
                    }

                    return storyFn(context as { args: object });
                },
                ...toArray(story.input.decorators),
            ],
        },
        story.meta.input,
        undefined,
        story.meta.preview.composed,
    );

    const Component = (props?: object) => {
        liveProps = props;

        try {
            return composed();
        }
        finally {
            liveProps = undefined;
        }
    };

    return Object.assign(Component, composed);
}
