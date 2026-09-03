import preview from '../../../.storybook/preview';

import { Button } from '@design-system/button';

const meta = preview.meta({
    title: 'Docgen/Package import',
    component: Button,
    tags: ['autodocs'],
    args: {
        label: 'From package',
        size: 'sm',
    },
});

export const Default = meta.story({});
