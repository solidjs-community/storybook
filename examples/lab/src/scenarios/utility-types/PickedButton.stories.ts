import preview from '../../../.storybook/preview';

import { PickedButton } from './PickedButton';

const meta = preview.meta({
    title: 'Docgen/Utility types',
    component: PickedButton,
    tags: ['autodocs'],
    args: {
        label: 'Save',
        size: 'sm',
    },
});

export const Default = meta.story({});
