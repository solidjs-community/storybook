import preview from '../../../.storybook/preview';

import { InlineCanvas } from './InlineCanvas';

/**
 * Autodocs canvases. The renderer sets `parameters.docs.story.inline: true`
 * (`src/renderer/docs.ts`). Open this docs page: Inline has no nested
 * preview iframe; Iframed does. Changing `label` in Controls should
 * update the inline canvas in place.
 */
const meta = preview.meta({
    title: 'Docs/Inline canvas',
    component: InlineCanvas,
    tags: ['autodocs'],
    args: {
        label: 'Rendered inline',
    },
});

export const Inline = meta.story({
    parameters: {
        docs: {
            story: {
                inline: true,
            },
        },
    },
});

export const Iframed = meta.story({
    args: {
        label: 'Rendered in an iframe',
    },
    parameters: {
        docs: {
            story: {
                inline: false,
                iframeHeight: 120,
            },
        },
    },
});
