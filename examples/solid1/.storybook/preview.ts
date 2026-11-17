import addonDocs from '@storybook/addon-docs';
import { definePreview } from 'storybook-solidjs-vite';

import './lab.css';

export default definePreview({
    addons: [addonDocs()],
});
