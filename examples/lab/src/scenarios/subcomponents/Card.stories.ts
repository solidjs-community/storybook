import { Card } from './Card';

import type { Meta, StoryObj } from 'storybook-solidjs-vite';

const meta = {
    title: 'Docgen Lab/Subcomponents/Card',
    component: Card,
    subcomponents: {
        Header: Card.Header,
        Footer: Card.Footer,
    },
    tags: ['autodocs'],
    args: {
        title: 'Invoice',
    },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
