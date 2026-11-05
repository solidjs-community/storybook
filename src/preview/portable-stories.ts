import { previewAddon } from 'storybook-solidjs-vite/renderer/preview-addon';
import {
    composeConfigs,
    composeStories as originalComposeStories,
    composeStory as originalComposeStory,
    setProjectAnnotations as originalSetProjectAnnotations,
    setDefaultProjectAnnotations,
} from 'storybook/preview-api';

import * as solidDocsAnnotations from '../renderer/docs';

import type {
    Args,
    ComponentAnnotations,
    ComposedStoryFn,
    LegacyStoryAnnotationsOrFn,
    NamedOrDefaultProjectAnnotations,
    NormalizedProjectAnnotations,
    ProjectAnnotations,
    Store_CSFExports,
    StoriesWithPartialProps,
    StoryAnnotationsOrFn,
} from 'storybook/internal/types';
import type { Meta, SolidRenderer } from './public-api';

/**
 * Function that sets the globalConfig of your storybook. The global config is the preview module of
 * your .storybook folder.
 *
 * It should be run a single time, so that your global config (e.g. decorators) is applied to your
 * stories when using `composeStories` or `composeStory`.
 *
 * Do not call it in a setup file when you use `@storybook/addon-vitest`: the addon applies the
 * project annotations itself and throws if they are applied twice.
 *
 * Example:
 *
 * ```ts
 * // setup-file.ts
 * import { setProjectAnnotations } from 'storybook-solidjs-vite';
 * import projectAnnotations from './.storybook/preview';
 *
 * setProjectAnnotations(projectAnnotations);
 * ```
 *
 * @param projectAnnotations - E.g. (import * as projectAnnotations from '../.storybook/preview')
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
 * Solid renderer annotations (`render`, `renderToCanvas`, `mount`, ...) plus the docs defaults.
 * `preview-addon` is aliased to the active Solid major, like in `definePreview`.
 */
// This will not be necessary once we have auto preset loading
export const INTERNAL_DEFAULT_PROJECT_ANNOTATIONS: ProjectAnnotations<SolidRenderer>
    = composeConfigs<SolidRenderer>([previewAddon, solidDocsAnnotations]);

/**
 * Function that will receive a story along with meta (e.g. a default export from a .stories file)
 * and optionally projectAnnotations e.g. (import * as projectAnnotations from
 * '../.storybook/preview) and will return a composed component that has all
 * args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing a story in scenarios outside of Storybook like unit testing.
 *
 * Example:
 *
 * ```ts
 * import { composeStory } from 'storybook-solidjs-vite';
 * import Meta, { Primary as PrimaryStory } from './Button.stories';
 *
 * const Primary = composeStory(PrimaryStory, Meta);
 *
 * test('renders primary button', async () => {
 *   await Primary.run();
 *   expect(document.body.textContent).toContain('Primary');
 * });
 * ```
 *
 * @param story
 * @param componentAnnotations - E.g. (import Meta from './Button.stories')
 * @param [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview')
 *   this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 * @param [exportsName] - In case your story does not contain a name and you want it to have a name.
 */
export function composeStory<TArgs extends Args = Args>(
    story: StoryAnnotationsOrFn<SolidRenderer, TArgs>,
    componentAnnotations: Meta<TArgs | any>,
    projectAnnotations?: ProjectAnnotations<SolidRenderer>,
    exportsName?: string
): ComposedStoryFn<SolidRenderer, Partial<TArgs>> {
    return originalComposeStory<SolidRenderer, TArgs>(
        story as unknown as LegacyStoryAnnotationsOrFn<SolidRenderer>,
        componentAnnotations as ComponentAnnotations<SolidRenderer, TArgs>,
        projectAnnotations,
        globalThis.globalProjectAnnotations ?? INTERNAL_DEFAULT_PROJECT_ANNOTATIONS,
        exportsName
    );
}

/** A stories module. `default` is optional so CSF Next modules (`meta.story()` exports) fit. */
type PortableStoriesModule = Partial<Store_CSFExports<SolidRenderer, any>> & Record<string, unknown>;

/** Composed `meta.story()` exports. Core's `StoriesWithPartialProps` only maps CSF 1-3 exports. */
type ComposedCsfNextStories<TModule> = {
    [K in keyof TModule as TModule[K] extends { readonly _tag: 'Story' } ? K : never]:
    TModule[K] extends { composed: { args: infer TArgs } }
        ? ComposedStoryFn<SolidRenderer, Partial<TArgs>>
        : never;
};

/**
 * Function that will receive a stories import (e.g. `import * as stories from './Button.stories'`)
 * and optionally projectAnnotations (e.g. `import * as projectAnnotations from
 * '../.storybook/preview`) and will return an object containing all the stories passed, but now as
 * a composed component that has all args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing stories in scenarios outside of Storybook like unit testing.
 *
 * Example:
 *
 * ```ts
 * import { composeStories } from 'storybook-solidjs-vite';
 * import * as stories from './Button.stories';
 *
 * const { Primary, Secondary } = composeStories(stories);
 *
 * test('renders primary button', async () => {
 *   await Primary.run();
 *   expect(document.body.textContent).toContain('Primary');
 * });
 * ```
 *
 * Unlike `@storybook/react`, the module may omit `export default`, as CSF Next stories files do.
 * The meta then comes from the `meta.story()` exports.
 *
 * @param csfExports - E.g. (import * as stories from './Button.stories')
 * @param [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview')
 *   this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 */
export function composeStories<TModule extends PortableStoriesModule>(
    csfExports: TModule,
    projectAnnotations?: ProjectAnnotations<SolidRenderer>
) {
    // @ts-expect-error core types `composeStoryFn` with the generic renderer
    const composedStories = originalComposeStories(csfExports, projectAnnotations, composeStory);

    return composedStories as unknown as Omit<
        StoriesWithPartialProps<SolidRenderer, TModule>,
        keyof Store_CSFExports
    > & ComposedCsfNextStories<TModule>;
}
