import preview from '../../../.storybook/preview';

import { Panel } from './Panel';

const meta = preview.meta({
    title: 'Docgen/JSX directives',
    component: Panel,
    tags: ['autodocs'],
    args: {
        title: 'Click outside',
    },
});

export const Default = meta.story({});
