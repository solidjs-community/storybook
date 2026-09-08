import type { Meta, Preview, StorybookConfig, StoryObj } from 'storybook-solidjs-vite';
import {
    createDecorator,
    createJSXDecorator,
    defineMain,
    definePreview,
} from 'storybook-solidjs-vite';

export const main: StorybookConfig = defineMain({
    stories: ['../src/**/*.mdx', '../src/**/*.stories.ts'],
    framework: 'storybook-solidjs-vite',
});

export const preview = definePreview({});

type ButtonProps = { label: string };

export const meta = {
    component: (_props: ButtonProps) => null,
} satisfies Meta<ButtonProps>;

export const Default: StoryObj<typeof meta> = {
    args: { label: 'Hello' },
};

export const sideEffectDecorator = createDecorator((storyFn) => storyFn());
export const jsxDecorator = createJSXDecorator((storyFn) => storyFn());

export type ConsumerPreview = Preview;
