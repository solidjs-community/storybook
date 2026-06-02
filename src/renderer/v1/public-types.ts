import { IS_SOLID_JSX_FLAG } from '../shared/public-types';

import type { Component, ComponentProps } from 'solid-js';
import type {
    AnnotatedStoryFn,
    Args,
    ArgsFromMeta,
    ArgsStoryFn,
    Canvas,
    ComponentAnnotations,
    DecoratorFunction,
    RenderContext as GenericRenderContext,
    StoryContext as GenericStoryContext,
    LoaderFunction,
    ProjectAnnotations,
    StoryAnnotations,
    StrictArgs,
    WebRenderer,
} from 'storybook/internal/types';
import type { SetOptional, Simplify } from 'type-fest';
import type { AddMocks } from '../shared/public-types';

export { IS_SOLID_JSX_FLAG } from '../shared/public-types';
export type { AddMocks, Args, ArgTypes, Parameters, StrictArgs } from '../shared/public-types';

export type SolidComponent<P extends Record<string, any> = Record<string, any>> = Component<P>;
export type SolidComponentProps<T extends SolidComponent> = ComponentProps<T>;

export type StoryFnReturnType = ReturnType<SolidComponent>;

export interface SolidRenderer extends WebRenderer {
    component: SolidComponent<any>;
    storyResult: StoryFnReturnType;
    mount: (ui?: StoryFnReturnType) => Promise<Canvas>;
}

export type Meta<TCmpOrArgs = Args> = [TCmpOrArgs] extends [SolidComponent<any>]
    ? ComponentAnnotations<SolidRenderer, SolidComponentProps<TCmpOrArgs>>
    : ComponentAnnotations<SolidRenderer, TCmpOrArgs>;

export type StoryFn<TCmpOrArgs = Args> = [TCmpOrArgs] extends [SolidComponent<any>]
    ? AnnotatedStoryFn<SolidRenderer, SolidComponentProps<TCmpOrArgs>>
    : AnnotatedStoryFn<SolidRenderer, TCmpOrArgs>;

export type StoryObj<TMetaOrCmpOrArgs = Args> = [TMetaOrCmpOrArgs] extends [
    {
        render?: ArgsStoryFn<SolidRenderer, any>;
        component?: infer Cmp;
        args?: infer DefaultArgs;
    }
]
    ? Simplify<
      (Cmp extends SolidComponent<any> ? SolidComponentProps<Cmp> : unknown)
      & ArgsFromMeta<SolidRenderer, TMetaOrCmpOrArgs>
    > extends infer TArgs
        ? StoryAnnotations<
            SolidRenderer,
            AddMocks<TArgs, DefaultArgs>,
            SetOptional<TArgs, keyof TArgs & keyof DefaultArgs>
        >
        : never
    : [TMetaOrCmpOrArgs] extends [SolidComponent<any>]
        ? StoryAnnotations<SolidRenderer, SolidComponentProps<TMetaOrCmpOrArgs>>
        : StoryAnnotations<SolidRenderer, TMetaOrCmpOrArgs>;

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SolidRenderer, TArgs> & {
    [IS_SOLID_JSX_FLAG]?: boolean;
};

export type Loader<TArgs = StrictArgs> = LoaderFunction<SolidRenderer, TArgs>;
export type Preview = ProjectAnnotations<SolidRenderer>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SolidRenderer, TArgs> & {
    renderToCanvas: () => Promise<void>;
};

export type RenderContext = GenericRenderContext<SolidRenderer>;
