import preview from '../../../.storybook/preview';

import { Button } from './Button';

const meta = preview.meta({
    title: 'Docgen/HTML attributes',
    component: Button,
    tags: ['autodocs'],
    args: {
        label: 'Click me',
    },
});

export const Default = meta.story({});
