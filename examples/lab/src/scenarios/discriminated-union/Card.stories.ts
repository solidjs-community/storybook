import preview from '../../../.storybook/preview';

import { Card } from './Card';

const meta = preview.meta({
    title: 'Docgen Lab/Discriminated Union/Card',
    component: Card,
    tags: ['autodocs'],
});

export const Solid = meta.story({
    args: {
        variant: 'solid',
        padding: 16,
    },
});

export const Ghost = meta.story({
    args: {
        variant: 'ghost',
        transparent: true,
    },
});
