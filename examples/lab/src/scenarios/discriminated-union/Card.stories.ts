import { Card } from './Card';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/Discriminated Union/Card',
    component: Card,
    tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {
    args: {
        variant: 'solid',
        padding: 16,
    },
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        transparent: true,
    },
};
