import { Badge } from './Badge';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/Badge',
    component: Badge,
    tags: ['autodocs'],
    args: {
        label: 'Draft',
    },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Success: Story = {
    args: {
        label: 'Published',
        variant: 'success',
        dot: true,
    },
};

export const Warning: Story = {
    args: {
        label: 'Review',
        variant: 'warning',
    },
};

export const Danger: Story = {
    args: {
        label: 'Blocked',
        variant: 'danger',
        dot: true,
    },
};
