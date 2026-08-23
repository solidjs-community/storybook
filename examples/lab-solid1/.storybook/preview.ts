import addonDocs from '@storybook/addon-docs';
import { definePreview } from 'storybook-solidjs-vite';

export default definePreview({
    addons: [addonDocs()],
});
