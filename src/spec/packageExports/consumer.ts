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

const legacyAddon = { parameters: { legacyAddon: true } };

export const preview = definePreview({ addons: [legacyAddon] });
export const previewFromNext = definePreviewFromNext({ addons: [] });

type ButtonProps = { label: string; size: 'sm' | 'lg' };

export const meta = {
    component: (_props: ButtonProps) => null,
} satisfies Meta<ButtonProps>;

export const Default: StoryObj<typeof meta> = {
    args: { label: 'Hello', size: 'lg' },
};

const csfNextMeta = preview.meta({
    component: (_props: ButtonProps) => null,
    args: { size: 'sm' },
});

export const CsfNextPrimary = csfNextMeta.story({
    args: { label: 'Hello' },
});

export const CsfNextTyped = csfNextMeta.type<{ args: { icon: string } }>().story({
    args: { label: 'Hello', icon: 'star' },
});

export const CsfNextTypedComponent = CsfNextTyped.Component;

// @ts-expect-error label is required
export const CsfNextMissing = csfNextMeta.story();

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
