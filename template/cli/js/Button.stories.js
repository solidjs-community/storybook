import { expect, fn } from 'storybook/test';

import preview from './preview';

import { Button } from './Button';

const meta = preview.meta({
    title: 'Example/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        backgroundColor: { control: 'color' },
    },
    args: { onClick: fn() },
});

export const Primary = meta.story({
    args: {
        primary: true,
        label: 'Button',
    },
});

Primary.test('renders a primary button', async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Button' });

    await expect(button).toHaveClass('storybook-button--primary');
});

export const Secondary = meta.story({
    args: {
        label: 'Button',
    },
});

Secondary.test('renders a secondary button', async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Button' });

    await expect(button).toHaveClass('storybook-button--secondary');
});

export const Large = meta.story({
    args: {
        size: 'large',
        label: 'Button',
    },
});

Large.test('renders a large button', async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Button' });

    await expect(button).toHaveClass('storybook-button--large');
});

export const Small = meta.story({
    args: {
        size: 'small',
        label: 'Button',
    },
});

Small.test('renders a small button and handles clicks', async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: 'Button' });

    await expect(button).toHaveClass('storybook-button--small');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
});
