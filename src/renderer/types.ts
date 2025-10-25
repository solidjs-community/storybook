import type { Component, JSXElement } from 'solid-js';

import type { Args, Canvas, WebRenderer } from 'storybook/internal/types';

export type { RenderContext } from 'storybook/internal/types';
export type { StoryContext } from './public-types';

export type StoryFnReturnType = JSXElement;

export interface SolidRenderer extends WebRenderer {
    // @ts-expect-error: Fix error in Github actions
    component: Component<this['T']>;
    storyResult: StoryFnReturnType;
    mount: (ui?: JSXElement) => Promise<Canvas>;
}

export interface ShowErrorArgs {
    title: string;
    description: string;
}

export type GlobalReactivityStore = {
    [key: string]: {
        args: Args;
        rendered: boolean;
        disposeFn: (() => void) | null;
    };
};

