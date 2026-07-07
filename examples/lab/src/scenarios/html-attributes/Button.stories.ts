import { Button } from './Button';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/HTML Attributes/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
        label: 'Click me',
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAria: Story = {
    args: {
        label: 'Accessible',
        'aria-label': 'Primary action',
        tabIndex: 0,
    },
};
