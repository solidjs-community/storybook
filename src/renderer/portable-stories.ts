import {
    composeConfigs,
    composeStories as originalComposeStories,
    composeStory as originalComposeStory,
    setDefaultProjectAnnotations,
    setProjectAnnotations as originalSetProjectAnnotations,
} from 'storybook/preview-api';

import * as solidProjectAnnotations from './entry-preview';

import type { SolidRenderer } from './types';

import type {
    Args,
    ComposedStoryFn,
    NamedOrDefaultProjectAnnotations,
    NormalizedProjectAnnotations,
    ProjectAnnotations,
    Store_CSFExports,
    StoriesWithPartialProps,
    StoryAnnotationsOrFn,
} from 'storybook/internal/types';

export const INTERNAL_DEFAULT_PROJECT_ANNOTATIONS: ProjectAnnotations<SolidRenderer> = composeConfigs([
    solidProjectAnnotations,
]);

/**
 * Function that sets the globalConfig of your storybook. The global config is the preview module of
 * your .storybook folder.
 *
 * It should be run a single time, so that your global config (e.g. decorators) is applied to your
 * stories when using `composeStories` or `composeStory`.
 *
 * Example:
 *
 * ```jsx
 * // setup-file.js
 * import { setProjectAnnotations } from 'storybook-solidjs';
 * import projectAnnotations from './.storybook/preview';
 *
 * setProjectAnnotations(projectAnnotations);
 * ```
 *
 * @param projectAnnotations - E.g. (import projectAnnotations from '../.storybook/preview')
 */
export function setProjectAnnotations(
    projectAnnotations:
      | NamedOrDefaultProjectAnnotations<any>
      | NamedOrDefaultProjectAnnotations<any>[]
): NormalizedProjectAnnotations<SolidRenderer> {
    setDefaultProjectAnnotations(INTERNAL_DEFAULT_PROJECT_ANNOTATIONS);

    return originalSetProjectAnnotations(
        projectAnnotations
    ) as NormalizedProjectAnnotations<SolidRenderer>;
}

/**
 * Compose a single Solid story with component and (optional) project annotations.
 */
export function composeStory<TArgs extends Args = Args>(
    story: StoryAnnotationsOrFn<SolidRenderer, TArgs>,
    componentAnnotations: any,
    projectAnnotations?: ProjectAnnotations<SolidRenderer>,
    exportsName?: string
): ComposedStoryFn<SolidRenderer, Partial<TArgs>> {
    return originalComposeStory<SolidRenderer, TArgs>(
        (story as unknown) as StoryAnnotationsOrFn<SolidRenderer, Args>,
        componentAnnotations,
        projectAnnotations,
        globalThis.globalProjectAnnotations ?? INTERNAL_DEFAULT_PROJECT_ANNOTATIONS,
        exportsName
    );
}

/**
 * Compose all stories exported from a CSF module for Solid.
 */
export function composeStories<TModule extends Store_CSFExports<SolidRenderer, any>>(
    csfExports: TModule,
    projectAnnotations?: ProjectAnnotations<SolidRenderer>
) {
    // @ts-expect-error (Converted from ts-ignore)
    const composedStories = originalComposeStories(csfExports, projectAnnotations, composeStory);

    return composedStories as unknown as Omit<
        StoriesWithPartialProps<SolidRenderer, TModule>,
        keyof Store_CSFExports
    >;
}
