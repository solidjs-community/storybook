import { expect, fn } from 'storybook/test';

import preview from '../../../.storybook/preview';

import { ClickButton } from './ClickButton';

const meta = preview.meta({
    title: 'Lab/Testing/ClickButton',
    component: ClickButton,
    args: {
        label: 'Click me',
        onClick: fn(),
    },
});

export const Default = meta.story({});

export const CallsHandler = meta.story({
    args: {
        onClick: fn(),
    },
});

CallsHandler.test('increments label count and invokes onClick', async ({ canvas, userEvent, args }) => {
    const button = canvas.getByRole('button', { name: /Click me/ });

    await expect(button).toHaveTextContent('Click me (0)');

    await userEvent.click(button);

    await expect(button).toHaveTextContent('Click me (1)');
    await expect(args.onClick).toHaveBeenCalledOnce();
});
