import type {
    Canvas,
    DecoratorFunction,
    RenderContext as GenericRenderContext,
    StoryContext as GenericStoryContext,
    StrictArgs,
    WebRenderer,
} from 'storybook/internal/types';
import type { Simplify } from 'type-fest';

export type { Args, ArgTypes, Parameters, StrictArgs } from 'storybook/internal/types';

/**
 * Marks decorators that return JSX so they are not re-run on every Storybook update.
 * Prefer `createJSXDecorator` over setting this flag manually.
 */
export const IS_SOLID_JSX_FLAG = '__isJSX';

// This performs a downcast to function types that are mocks, when a mock fn is given to meta args.
export type AddMocks<TArgs, DefaultArgs> = Simplify<{
    [T in keyof TArgs]: T extends keyof DefaultArgs
        ? DefaultArgs[T] extends (...args: any) => any & { mock: object }
            ? DefaultArgs[T]
            : TArgs[T]
        : TArgs[T];
}>;

/** Loose renderer shape for shared runtime code (v1 entry-preview and v2 entry-preview). */
export interface SolidRenderer extends WebRenderer {
    component: (props: Record<string, any>) => any;
    storyResult: any;
    mount: (ui?: any) => Promise<Canvas>;
}

export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SolidRenderer, TArgs> & {
    [IS_SOLID_JSX_FLAG]?: boolean;
};

export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SolidRenderer, TArgs> & {
    renderToCanvas: () => Promise<void>;
};

export type RenderContext = GenericRenderContext<SolidRenderer>;
