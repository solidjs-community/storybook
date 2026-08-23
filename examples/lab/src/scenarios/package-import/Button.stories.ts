import preview from '../../../.storybook/preview';

import { Button } from '@design-system/button';

const meta = preview.meta({
    title: 'Docgen Lab/Package Import/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
        label: 'From package',
        size: 'sm',
    },
});

export const Primary = meta.story({});

export const Large = meta.story({
    args: {
        size: 'lg',
    },
});
