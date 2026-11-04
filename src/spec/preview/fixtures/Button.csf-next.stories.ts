import { definePreview } from '../../../index';
import { Button, recordPlay } from './Button';

const preview = definePreview({ addons: [] });

const meta = preview.meta({
    title: 'Portable/CSFNext',
    component: Button,
    args: { label: 'From meta' },
});

export const Primary = meta.story({
    args: { label: 'CSF Next primary', primary: true },
    play: async(context) => {
        recordPlay(context);
    },
});

export const Secondary = meta.story();
