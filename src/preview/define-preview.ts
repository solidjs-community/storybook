import { definePreview as definePreviewBase } from 'storybook/internal/csf';

import * as solidDocsAnnotations from '../renderer/docs';
import { createReactiveStoryComponent } from './reactive-story-component';

import type {
    AddonTypes,
    InferTypes,
    Meta,
    MetaInput,
    MetaTypes,
    Preview,
    PreviewAddon,
    PreviewAddonEntry,
    Story,
    StoryArgs,
    TypedMetaArgKeys,
} from 'storybook/internal/csf';
import type {
    Args,
    ArgsStoryFn,
    DecoratorFunction,
    ProjectAnnotations,
    StoryAnnotations,
} from 'storybook/internal/types';
import type { EmptyMetaArgs, SolidComponent, SolidTypes } from './public-api';

/**
 * Input of `definePreview()`. `addons` is required, like `@storybook/react`.
 * It takes typed addons (`definePreviewAddon`) and legacy annotation
 * namespaces (`import * as addon from 'some-addon/preview'`).
 */
export type DefinePreviewInput<Addons extends PreviewAddonEntry[] = PreviewAddonEntry[]> = {
    addons: Addons;
} & ProjectAnnotations<SolidTypes & InferTypes<Addons>>;

/**
 * Solid preview with type-safe CSF factories. Mirrors `ReactPreview`:
 * `meta()` tracks which args the meta sets, so values need no `as const`
 * and every key must be an arg.
 */
export interface SolidPreview<T extends AddonTypes> extends Omit<
    Preview<SolidTypes & T>,
    'meta' | 'type'
> {
    /**
     * Narrows the preview type, e.g. to add args that are not inferred from the component.
     *
     * @example
     *
     * ```ts
     * const meta = preview.type<{ args: { theme: 'light' | 'dark' } }>().meta({ component: Button });
     * ```
     */
    type<R>(): SolidPreview<T & R>;

    meta<
        TArgs extends Args,
        Decorators extends DecoratorFunction<SolidTypes & T, any>,
        TMetaArgKeys extends PropertyKey = never,
    >(
        meta: {
            render?: ArgsStoryFn<SolidTypes & T, TArgs & T['args']>;
            component?: SolidComponent<TArgs>;
        } & MetaInput<SolidTypes & T, TArgs, Decorators, TMetaArgKeys>
    ): SolidMeta<MetaTypes<SolidTypes & T, TArgs, Decorators, TMetaArgKeys>, TMetaArgKeys>;
}

/**
 * Meta returned by `preview.meta()`. Args set in meta are optional in stories.
 * The remaining required args must be set by each story.
 */
export interface SolidMeta<
    T extends SolidTypes,
    TMetaArgKeys extends PropertyKey = never,
> extends Meta<T, TMetaArgKeys> {
    /**
     * A story whose render takes no args. No args are required.
     *
     * @example
     *
     * ```tsx
     * export const Custom = meta.story(() => <div>Custom</div>);
     * export const WithRender = meta.story({ render: () => <Button label="Static" /> });
     * ```
     */
    story<
        TInput extends
            | (() => SolidTypes['storyResult'])
            | (StoryAnnotations<T, T['args']> & {
                render: () => SolidTypes['storyResult'];
            }),
    >(
        story: TInput
    ): SolidStory<T, TInput extends () => SolidTypes['storyResult'] ? { render: TInput } : TInput>;

    /** A story with args and annotations. Args the meta did not set are required here. */
    story<
        TInput extends StoryAnnotations<T, T['args'], StoryArgs<T['args'], TMetaArgKeys>>,
    >(
        story: TInput
    ): SolidStory<T, TInput>;

    /** A story with no input. Only available when the meta sets every required arg. */
    story(
        ..._args: Partial<T['args']> extends StoryArgs<T['args'], TMetaArgKeys> ? [] : [never]
    ): SolidStory<T, EmptyMetaArgs>;

    /**
     * Adds types to the stories created from the returned meta, such as an arg only one story has:
     * `meta.type<{ args: { icon: string } }>().story({ args: { icon: 'star' } })`.
     */
    type<S>(): SolidMeta<T & S, TypedMetaArgKeys<TMetaArgKeys, S>>;
}

/**
 * Story returned by `meta.story()`. `Component` renders the story in JSX
 * and keeps its props reactive.
 */
export interface SolidStory<
    T extends SolidTypes,
    TInput extends {
        play?: (...args: never[]) => void;
        render?: (...args: never[]) => T['storyResult'];
    },
> extends Story<T, TInput> {
    Component: SolidComponent<Partial<T['args']>>;
}

/** Stable `definePreview` type for Solid 1 and Solid 2. */
export type SolidDefinePreview = <Addons extends PreviewAddonEntry[]>(
    input: DefinePreviewInput<Addons>
) => SolidPreview<SolidTypes & InferTypes<Addons>>;

export function createSolidDefinePreview(
    solidAnnotations: PreviewAddon<never>
): SolidDefinePreview {
    return <Addons extends PreviewAddonEntry[]>(input: DefinePreviewInput<Addons>) => {
        const preview = definePreviewBase({
            ...input,
            addons: [
                solidAnnotations,
                solidDocsAnnotations,
                ...(input.addons ?? []),
            ] as PreviewAddon<InferTypes<Addons>>[],
        }) as unknown as SolidPreview<SolidTypes & InferTypes<Addons>>;

        const defineMeta = preview.meta.bind(preview);

        preview.meta = (_input) => {
            const meta = defineMeta(_input);
            const defineStory = meta.story.bind(meta);

            meta.story = (__input?: any) => {
                const story = defineStory(__input);

                story.Component = createReactiveStoryComponent(story);

                return story;
            };

            return meta;
        };

        return preview;
    };
}
