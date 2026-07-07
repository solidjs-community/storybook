import { Button } from '@design-system/button';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/Package Import/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
        label: 'From package',
        size: 'sm',
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Large: Story = {
    args: {
        size: 'lg',
    },
};
