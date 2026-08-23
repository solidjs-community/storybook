import preview from '../../../.storybook/preview';

import { Callout } from './Callout';

const meta = preview.meta({
    title: 'Docgen/All types',
    component: Callout,
    tags: ['autodocs'],
    args: {
        label: 'Release notes',
        count: 3,
        enabled: true,
        size: 'md',
        tone: 'neutral',
        appearance: 'solid',
        padding: 16,
        tags: ['docgen', 'solid'],
        accentColor: '#6366f1',
        dueDate: '2026-08-23',
        meta: { id: 'callout-1' },
        id: 'callout',
        title: 'Callout',
    },
});

export const Solid = meta.story({});

export const Ghost = meta.story({
    args: {
        appearance: 'ghost',
        transparent: true,
        tone: 'info',
    },
});

export const Disabled = meta.story({
    args: {
        enabled: false,
        tone: 'danger',
        label: 'Locked',
    },
});
