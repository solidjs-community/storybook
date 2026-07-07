import { PickedButton } from './PickedButton';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/Utility Types/PickedButton',
    component: PickedButton,
    tags: ['autodocs'],
    args: {
        label: 'Save',
        size: 'sm',
    },
} satisfies Meta<typeof PickedButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Large: Story = {
    args: {
        size: 'lg',
    },
};
