import { createDefinePreview as createDefinePreviewBase } from '../shared/create-define-preview';
import * as solidAnnotations from './entry-preview';

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
import type { AddMocks, SolidComponent, SolidRenderer } from './public-types';

/** Extracts and unions all args types from an array of decorators. */
type DecoratorsArgs<TRenderer extends Renderer, Decorators> = UnionToIntersection<
    Decorators extends DecoratorFunction<TRenderer, infer TArgs> ? TArgs : unknown
>;

type InferArgs<TArgs, T, Decorators> = Simplify<
    TArgs & Simplify<OmitIndexSignature<DecoratorsArgs<SolidRenderer & T, Decorators>>>
>;

type InferSolidTypes<T, TArgs, Decorators> = SolidRenderer
  & T & { args: Simplify<InferArgs<TArgs, T, Decorators>> };

export type DefinePreviewInput<Addons extends PreviewAddon<never>[]> = {
    addons: Addons;
} & ProjectAnnotations<SolidRenderer & InferTypes<Addons>>;

/** @ts-expect-error We cannot implement the meta faithfully here, but that is okay. */
export interface SolidPreview<T extends AddonTypes> extends Preview<SolidRenderer & T> {
    type: <R>() => SolidPreview<T & R>;

    meta: <
        TArgs extends Args,
        Decorators extends DecoratorFunction<SolidRenderer & T, any>,
        TMetaArgs extends Partial<TArgs & T['args']>
    >(
        meta: {
            render?: ArgsStoryFn<SolidRenderer & T, TArgs & T['args']>;
            component?: SolidComponent<TArgs>;
            decorators?: Decorators | Decorators[];
            args?: TMetaArgs;
        } & Omit<
            ComponentAnnotations<SolidRenderer & T, TArgs>,
            'decorators' | 'component' | 'args' | 'render'
        >
    ) => SolidMeta<
        InferSolidTypes<T, TArgs, Decorators>,
        Omit<ComponentAnnotations<InferSolidTypes<T, TArgs, Decorators>>, 'args'> & {
            args: Partial<TArgs> extends TMetaArgs ? Record<string, never> : TMetaArgs;
        }
    >;
}

export interface SolidMeta<T extends SolidRenderer, MetaInput extends ComponentAnnotations<T>>
    /** @ts-expect-error SolidMeta requires two type parameters, but Meta's constraints differ */
    extends Meta<T, MetaInput> {
    story: (<
        TInput extends
            | (() => SolidRenderer['storyResult'])
            | (StoryAnnotations<T, T['args']> & {
                render: () => SolidRenderer['storyResult'];
            })
    >(
        story: TInput
    ) => SolidStory<T, TInput extends () => SolidRenderer['storyResult'] ? { render: TInput } : TInput>) & (<
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
    ) => SolidStory<T, Record<string, never>>);
}

export interface SolidStory<T extends SolidRenderer, TInput extends StoryAnnotations<T, T['args']>>
    extends Story<T, TInput> {
    Component: SolidComponent<Partial<T['args']>>;
}

export const definePreview = createDefinePreviewBase(solidAnnotations as never) as unknown as <
    Addons extends PreviewAddon<never>[]
>(
    input: DefinePreviewInput<Addons>
) => SolidPreview<SolidRenderer & InferTypes<Addons>>;
