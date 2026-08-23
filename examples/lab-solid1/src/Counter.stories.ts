import { expect } from 'storybook/test';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Counter } from './Counter';

const meta = {
    title: 'Solid 1/Counter',
    component: Counter,
    tags: ['autodocs'],
    args: {
        label: 'Clicks',
        initial: 0,
    },
} satisfies Meta<typeof Counter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const IncrementsOnClick: Story = {
    play: async ({ canvas, userEvent }) => {
        const output = canvas.getByTestId('counter-value');

        await expect(output).toHaveTextContent('0');

        await userEvent.click(canvas.getByRole('button', { name: 'Increment' }));

        await expect(output).toHaveTextContent('1');
    },
};
