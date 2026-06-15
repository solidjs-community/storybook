import { definePreview as definePreviewBase } from 'storybook/internal/csf';

import * as solidArgTypesAnnotations from '../renderer/argtypes';
import * as solidDocsAnnotations from '../renderer/docs';

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
import type { AddMocks, EmptyMetaArgs, SolidComponent, SolidTypes } from './public-api';

/** Extracts and unions all args types from an array of decorators. */
type DecoratorsArgs<TRenderer extends Renderer, Decorators> = UnionToIntersection<
    Decorators extends DecoratorFunction<TRenderer, infer TArgs> ? TArgs : unknown
>;

type InferArgs<TArgs, T, Decorators> = Simplify<
    TArgs & Simplify<OmitIndexSignature<DecoratorsArgs<SolidTypes & T, Decorators>>>
>;

type InferSolidTypes<T, TArgs, Decorators> = SolidTypes & T & {
    args: Simplify<InferArgs<TArgs, T, Decorators>>;
};

export type DefinePreviewInput<Addons extends PreviewAddon<never>[] = []> = {
    addons?: Addons;
} & ProjectAnnotations<SolidTypes & InferTypes<Addons>>;

/** @ts-expect-error We cannot implement the meta faithfully here, but that is okay. */
export interface SolidPreview<T extends AddonTypes> extends Preview<SolidTypes & T> {
    type: <R>() => SolidPreview<T & R>;

    meta: <
        TArgs extends Args,
        Decorators extends DecoratorFunction<SolidTypes & T, any>,
        TMetaArgs extends Partial<TArgs & T['args']>
    >(
        meta: {
            render?: ArgsStoryFn<SolidTypes & T, TArgs & T['args']>;
            component?: SolidComponent<TArgs>;
            decorators?: Decorators | Decorators[];
            args?: TMetaArgs;
        } & Omit<
            ComponentAnnotations<SolidTypes & T, TArgs>,
            'decorators' | 'component' | 'args' | 'render'
        >
    ) => SolidMeta<
        InferSolidTypes<T, TArgs, Decorators>,
        Omit<ComponentAnnotations<InferSolidTypes<T, TArgs, Decorators>>, 'args'> & {
            args: Partial<TArgs> extends TMetaArgs ? EmptyMetaArgs : TMetaArgs;
        }
    >;
}

export interface SolidMeta<T extends SolidTypes, MetaInput extends ComponentAnnotations<T>>
    /** @ts-expect-error SolidMeta requires two type parameters, but Meta's constraints differ */
    extends Meta<T, MetaInput> {
    story: (<
        TInput extends
            | (() => SolidTypes['storyResult'])
            | (StoryAnnotations<T, T['args']> & {
                render: () => SolidTypes['storyResult'];
            })
    >(
        story: TInput
    ) => SolidStory<T, TInput extends () => SolidTypes['storyResult'] ? { render: TInput } : TInput>) & (<
        TInput extends Simplify<
            StoryAnnotations<
                T,
                AddMocks<T['args'], MetaInput['args']>,
                SetOptional<T['args'], keyof T['args'] & keyof MetaInput['args']>
            >
        >
    >(
        story: TInput
        /** @ts-expect-error hard */
    ) => SolidStory<T, TInput>) & ((
        ..._args: Partial<T['args']> extends SetOptional<
            T['args'],
            keyof T['args'] & keyof MetaInput['args']
        >
            ? []
            : [never]
    ) => SolidStory<T, EmptyMetaArgs>);
}

export interface SolidStory<T extends SolidTypes, TInput extends StoryAnnotations<T, T['args']>>
    extends Story<T, TInput> {
    Component: SolidComponent<Partial<T['args']>>;
}

export function createSolidDefinePreview(solidAnnotations: PreviewAddon<never>) {
    return (<Addons extends PreviewAddon<never>[] = []>(
        input: DefinePreviewInput<Addons>
    ) => {
        const { addons, ...projectAnnotations } = input;

        const preview = definePreviewBase({
            ...projectAnnotations,
            addons: [
                solidAnnotations,
                solidArgTypesAnnotations,
                solidDocsAnnotations,
                ...(addons ?? []),
            ],
        });

        const defineMeta = preview.meta.bind(preview);

        preview.meta = (_input) => {
            const meta = defineMeta(_input);
            const defineStory = meta.story.bind(meta);

            meta.story = (__input: any) => {
                const story = defineStory(__input);

                // @ts-ignore this is a private property used only here
                story.Component = story.__compose();

                return story;
            };

            return meta;
        };

        return preview;
    }) as unknown as <
        Addons extends PreviewAddon<never>[] = []
    >(
        input: DefinePreviewInput<Addons>
    ) => SolidPreview<SolidTypes & InferTypes<Addons>>;
}
