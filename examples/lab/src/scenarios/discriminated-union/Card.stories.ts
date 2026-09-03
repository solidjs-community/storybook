import preview from '../../../.storybook/preview';

import { Card } from './Card';

const meta = preview.meta({
    title: 'Docgen/Discriminated union',
    component: Card,
    tags: ['autodocs'],
    args: {
        variant: 'solid',
        padding: 16,
    },
});

export const Default = meta.story({});
