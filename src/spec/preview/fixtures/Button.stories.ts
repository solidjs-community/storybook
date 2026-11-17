import { Button, recordPlay } from './Button';

import type { Meta, StoryObj } from '../../../index';

const meta = {
    title: 'Portable/CSF3',
    component: Button,
    args: { label: 'From meta' },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: { label: 'CSF 3 primary', primary: true },
    play: async(context) => {
        recordPlay(context);
    },
};

export const Secondary: Story = {};
