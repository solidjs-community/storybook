import addonDocs from '@storybook/addon-docs';
import { definePreview } from 'storybook-solidjs-vite';

export default definePreview({
    parameters: {
        controls: {
            matchers: {
                color: /(?:background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    addons: [addonDocs()],
});
