import type { Component, JSXElement } from 'solid-js';

import type { Args, Canvas, WebRenderer } from 'storybook/internal/types';

export type { RenderContext, StoryContext } from 'storybook/internal/types';

export interface SolidRenderer extends WebRenderer {
    // @ts-expect-error: Fix error in Github actions
    component: Component<this['T']>;
    storyResult: StoryFnSolidReturnType;
    mount: (ui?: JSXElement) => Promise<Canvas>;
}

export interface ShowErrorArgs {
    title: string;
    description: string;
}

export type ComponentsData = {
    [key: string]: {
        args: Args;
        rendered?: boolean;
        disposeFn?: () => void;
    };
};

export type StoryFnSolidReturnType = JSXElement;
