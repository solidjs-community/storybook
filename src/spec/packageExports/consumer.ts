import type {
    Decorator,
    Meta,
    Preview,
    SolidDefinePreview,
    SolidRenderer,
    StorybookConfig,
    StoryFn,
    StoryObj,
} from 'storybook-solidjs-vite';
import {
    createDecorator,
    createJSXDecorator,
    defineMain,
    definePreview,
} from 'storybook-solidjs-vite';
import { definePreview as definePreviewFromNext } from 'storybook-solidjs-vite/next';

export const main: StorybookConfig = defineMain({
    stories: ['../src/**/*.mdx', '../src/**/*.stories.ts'],
    framework: 'storybook-solidjs-vite',
});

export const preview = definePreview({});
export const previewFromNext = definePreviewFromNext({});

type ButtonProps = { label: string };

export const meta = {
    component: (_props: ButtonProps) => null,
} satisfies Meta<ButtonProps>;

export const Default: StoryObj<typeof meta> = {
    args: { label: 'Hello' },
};

const csfNextMeta = preview.meta({
    component: (_props: ButtonProps) => null,
    args: { label: 'Hello' },
});

export const CsfNextPrimary = csfNextMeta.story({
    args: { label: 'Hello' },
});

export const sideEffectDecorator = createDecorator((storyFn) => storyFn());
export const jsxDecorator = createJSXDecorator((storyFn) => storyFn());

export type ConsumerPreview = Preview;
export type ConsumerStoryFn = StoryFn<ButtonProps>;
export type ConsumerDecorator = Decorator;
export type ConsumerRenderer = SolidRenderer;
export type ConsumerDefinePreview = SolidDefinePreview;
export type ConsumerSolidPreview = ReturnType<typeof definePreview>;
export type ConsumerSolidMeta = ReturnType<(typeof preview)['meta']>;
export type ConsumerSolidStory = typeof CsfNextPrimary;

export type {
    SolidMeta,
    SolidPreview,
    SolidStory,
} from 'storybook-solidjs-vite';
