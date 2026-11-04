import preview from '../../../.storybook/preview';

import { Card } from './Card';

const meta = preview.meta({
    title: 'Docgen/Discriminated union',
    component: Card,
    tags: ['autodocs'],
    args: {
        variant: 'solid',
    },
});

// Meta args may only set keys shared by every union member, so `padding` is set per story.
export const Default = meta.story({
    args: {
        padding: 16,
    },
});
