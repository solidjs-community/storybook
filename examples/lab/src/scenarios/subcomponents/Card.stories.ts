import preview from '../../../.storybook/preview';

import { Card } from './Card';

const meta = preview.meta({
    title: 'Docgen/Subcomponents',
    component: Card,
    subcomponents: {
        Header: Card.Header,
        Footer: Card.Footer,
    },
    tags: ['autodocs'],
    args: {
        title: 'Invoice',
    },
});

export const Default = meta.story({});
