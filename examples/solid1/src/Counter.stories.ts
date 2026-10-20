import { expect } from 'storybook/test';

import preview from '../.storybook/preview';

import { Counter } from './Counter';

const meta = preview.meta({
    title: 'Solid 1/Counter',
    component: Counter,
    tags: ['autodocs'],
    args: {
        label: 'Clicks',
        initial: 0,
    },
});

export const Default = meta.story({});

export const IncrementsOnClick = meta.story({});

IncrementsOnClick.test('increments the counter', async ({ canvas, userEvent }) => {
    const output = canvas.getByTestId('counter-value');

    await expect(output).toHaveTextContent('0');

    await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));

    await expect(output).toHaveTextContent('1');
});
