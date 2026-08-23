import preview from '../../../.storybook/preview';

import { PickedButton } from './PickedButton';

const meta = preview.meta({
    title: 'Docgen Lab/Utility Types/PickedButton',
    component: PickedButton,
    tags: ['autodocs'],
    args: {
        label: 'Save',
        size: 'sm',
    },
});

export const Default = meta.story({});

export const Large = meta.story({
    args: {
        size: 'lg',
    },
});
