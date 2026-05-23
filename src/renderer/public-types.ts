/**
 * Shared Solid renderer types (no imports from `preview.ts` or `index.ts`).
 */
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

export type { Args, ArgTypes, Parameters, StrictArgs } from 'storybook/internal/types';

/**
 * Marks decorators that return JSX so they are not re-run on every Storybook update.
 * Prefer `createJSXDecorator` over setting this flag manually.
 */
export const IS_SOLID_JSX_FLAG = '__isJSX';

export type SolidComponent<P extends Record<string, any> = Record<string, any>> = Component<P>;
export type SolidComponentProps<T extends SolidComponent> = ComponentProps<T>;

export type StoryFnReturnType = ReturnType<SolidComponent>;

export interface SolidRenderer extends WebRenderer {
    component: SolidComponent;
    storyResult: StoryFnReturnType;
    mount: (ui?: StoryFnReturnType) => Promise<Canvas>;
}

/**
 * Metadata to configure the stories for a component.
 *
 * @see [Default export](https://storybook.js.org/docs/api/csf#default-export)
 */
export type Meta<TCmpOrArgs = Args> = [TCmpOrArgs] extends [SolidComponent<any>]
    ? ComponentAnnotations<SolidRenderer, SolidComponentProps<TCmpOrArgs>>
    : ComponentAnnotations<SolidRenderer, TCmpOrArgs>;

/**
 * Story function that represents a CSFv2 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
export type StoryFn<TCmpOrArgs = Args> = [TCmpOrArgs] extends [SolidComponent<any>]
    ? AnnotatedStoryFn<SolidRenderer, SolidComponentProps<TCmpOrArgs>>
    : AnnotatedStoryFn<SolidRenderer, TCmpOrArgs>;

/**
 * Story object that represents a CSFv3 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
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

// This performs a downcast to function types that are mocks, when a mock fn is given to meta args.
export type AddMocks<TArgs, DefaultArgs> = Simplify<{
    [T in keyof TArgs]: T extends keyof DefaultArgs
        ? DefaultArgs[T] extends (...args: any) => any & { mock: object } // allow any function with a mock object
            ? DefaultArgs[T]
            : TArgs[T]
        : TArgs[T];
}>;

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SolidRenderer, TArgs> & {
    // If decorator return JSX - user probably don't want to run it again on each update
    //  this flag prevents it from being called again
    [IS_SOLID_JSX_FLAG]?: boolean;
};

export type Loader<TArgs = StrictArgs> = LoaderFunction<SolidRenderer, TArgs>;
export type Preview = ProjectAnnotations<SolidRenderer>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SolidRenderer, TArgs> & {
    renderToCanvas: () => Promise<void>;
};

export type RenderContext = GenericRenderContext<SolidRenderer>;
