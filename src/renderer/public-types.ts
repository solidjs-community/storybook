import type { SolidRenderer } from './types';
import type { Component as ComponentType, ComponentProps } from 'solid-js';
import type {
    AnnotatedStoryFn,
    Args,
    ArgsFromMeta,
    ArgsStoryFn,
    ComponentAnnotations,
    DecoratorFunction,
    LoaderFunction,
    ProjectAnnotations,
    StoryAnnotations,
    StoryContext as GenericStoryContext,
    StrictArgs,
} from 'storybook/internal/types';
import type { SetOptional, Simplify } from 'type-fest';

export type { ArgTypes, Args, Parameters, StrictArgs } from 'storybook/internal/types';
export type { SolidRenderer };

/**
 * Metadata to configure the stories for a component.
 *
 * @see [Default export](https://storybook.js.org/docs/api/csf#default-export)
 */
export type Meta<TCmpOrArgs = Args> = [TCmpOrArgs] extends [ComponentType<any>]
    ? ComponentAnnotations<SolidRenderer, ComponentProps<TCmpOrArgs>>
    : ComponentAnnotations<SolidRenderer, TCmpOrArgs>;

/**
 * Story function that represents a CSFv2 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
export type StoryFn<TCmpOrArgs = Args> = [TCmpOrArgs] extends [ComponentType<any>]
    ? AnnotatedStoryFn<SolidRenderer, ComponentProps<TCmpOrArgs>>
    : AnnotatedStoryFn<SolidRenderer, TCmpOrArgs>;

/**
 * Story object that represents a CSFv3 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
export type StoryObj<TMetaOrCmpOrArgs = Args> = [TMetaOrCmpOrArgs] extends [
    {
        render?: ArgsStoryFn<SolidRenderer, any>;
        component?: infer Component;
        args?: infer DefaultArgs;
    }
]
    ? Simplify<
      (Component extends ComponentType<any> ? ComponentProps<Component> : unknown) &
      ArgsFromMeta<SolidRenderer, TMetaOrCmpOrArgs>
    > extends infer TArgs
        ? StoryAnnotations<
            SolidRenderer,
            AddMocks<TArgs, DefaultArgs>,
            SetOptional<TArgs, keyof TArgs & keyof DefaultArgs>
        >
        : never
    : [TMetaOrCmpOrArgs] extends [ComponentType<any>]
        ? StoryAnnotations<SolidRenderer, ComponentProps<TMetaOrCmpOrArgs>>
        : StoryAnnotations<SolidRenderer, TMetaOrCmpOrArgs>;

// This performs a downcast to function types that are mocks, when a mock fn is given to meta args.
export type AddMocks<TArgs, DefaultArgs> = Simplify<{
    [T in keyof TArgs]: T extends keyof DefaultArgs
        ? DefaultArgs[T] extends ((...args: any) => any) & { mock: object }
            ? DefaultArgs[T]
            : TArgs[T]
        : TArgs[T];
}>;

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SolidRenderer, TArgs>;
export type Loader<TArgs = StrictArgs> = LoaderFunction<SolidRenderer, TArgs>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SolidRenderer, TArgs>;
export type Preview = ProjectAnnotations<SolidRenderer>;
