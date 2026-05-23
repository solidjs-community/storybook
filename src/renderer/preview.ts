/**
 * CSF Next `definePreview` helper.
 */
import { definePreview as definePreviewBase } from 'storybook/internal/csf';

import * as solidDocsAnnotations from './docs/entry-preview';
import * as solidArgTypesAnnotations from './docs/entry-preview-argtypes';
import * as solidAnnotationsV1 from './v1/entry-preview';

import type { AddonTypes, InferTypes, Meta, Preview, PreviewAddon, Story } from 'storybook/internal/csf';
import type {
    Args,
    ArgsStoryFn,
    ComponentAnnotations,
    DecoratorFunction,
    ProjectAnnotations,
    Renderer,
    StoryAnnotations,
} from 'storybook/internal/types';
import type { OmitIndexSignature, SetOptional, Simplify, UnionToIntersection } from 'type-fest';
import type { SolidVersion } from '../framework/types';
import type { AddMocks, SolidComponent, SolidRenderer } from './public-types';

type DefinePreviewInput<Addons extends PreviewAddon<never>[]> = {
    addons: Addons;
    /** Must match `framework.options.solidVersion` in `.storybook/main.ts`. Defaults to `1`. */
    solidVersion?: SolidVersion;
} & ProjectAnnotations<SolidRenderer & InferTypes<Addons>>;

function solidEntryPreviewAnnotations(solidVersion: SolidVersion = 1) {
    if (solidVersion === 1) {
        return solidAnnotationsV1;
    }

    return {};
}

export function definePreview<Addons extends PreviewAddon<never>[]>(
    input: DefinePreviewInput<Addons>
): SolidPreview<SolidRenderer & InferTypes<Addons>> {
    const { solidVersion = 1, addons, ...projectAnnotations } = input;
    const solidAnnotations = solidEntryPreviewAnnotations(solidVersion);

    const preview = definePreviewBase({
        ...projectAnnotations,
        addons: [
            solidAnnotations as unknown as PreviewAddon<never>,
            solidArgTypesAnnotations,
            solidDocsAnnotations,
            ...(addons ?? []),
        ],
    }) as unknown as SolidPreview<SolidRenderer & InferTypes<Addons>>;

    // Add Component property to the story object
    const _originalPreviewMeta = preview.meta.bind(preview);

    preview.meta = (_input) => {
        const meta = _originalPreviewMeta(_input);
        const _originalMetaStory = meta.story.bind(meta);

        meta.story = (__input: any) => {
            const story = _originalMetaStory(__input);

            // @ts-ignore this is a private property used only here
            story.Component = story.__compose();

            return story;
        };

        return meta;
    };

    return preview;
}

/** @ts-expect-error We cannot implement the meta faithfully here, but that is okay. */
export interface SolidPreview<T extends AddonTypes> extends Preview<SolidRenderer & T> {
    meta: <
        TArgs extends Args,
        Decorators extends DecoratorFunction<SolidRenderer & T, any>,
        // Try to make Exact<Partial<TArgs>, TMetaArgs> work
        TMetaArgs extends Partial<TArgs>
    >(
        meta: {
            render?: ArgsStoryFn<SolidRenderer & T, TArgs>;
            component?: SolidComponent<TArgs>;
            decorators?: Decorators | Decorators[];
            args?: TMetaArgs;
        } & Omit<
            ComponentAnnotations<SolidRenderer & T, TArgs>,
      'decorators' | 'component' | 'args' | 'render'
        >
    ) => SolidMeta<
      SolidRenderer
      & T & {
          args: Simplify<
          TArgs & Simplify<OmitIndexSignature<DecoratorsArgs<SolidRenderer & T, Decorators>>>
          >;
      },
      { args: Partial<TArgs> extends TMetaArgs ? Record<string, never> : TMetaArgs }
    >;
}

type DecoratorsArgs<TRenderer extends Renderer, Decorators> = UnionToIntersection<
    Decorators extends DecoratorFunction<TRenderer, infer TArgs> ? TArgs : unknown
>;

interface SolidMeta<T extends SolidRenderer, MetaInput extends ComponentAnnotations<T>>
    /** @ts-expect-error hard */
    extends Meta<T, MetaInput> {
    // Required args don't need to be provided when the user uses an empty render
    story: (<
        TInput extends
            | (() => SolidRenderer['storyResult'])
            | (StoryAnnotations<T, T['args']> & {
                render?: () => SolidRenderer['storyResult'];
            })
    >(
        story?: TInput
    ) => SolidStory<T, TInput extends () => SolidRenderer['storyResult'] ? { render: TInput } : TInput>) & (<
        TInput extends Simplify<
            StoryAnnotations<
                T,
                // TODO: infer mocks from story itself as well
                AddMocks<T['args'], MetaInput['args']>,
                SetOptional<T['args'], keyof T['args'] & keyof MetaInput['args']>
            >
        >
    >(
        story?: TInput
        /** @ts-expect-error hard */
    ) => SolidStory<T, TInput>);
}

export interface SolidStory<T extends SolidRenderer, TInput extends StoryAnnotations<T, T['args']>>
    extends Story<T, TInput> {
    Component: SolidComponent<Partial<T['args']>>;
}
