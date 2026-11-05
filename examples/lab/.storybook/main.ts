import { defineMain } from 'storybook-solidjs-vite';

export default defineMain({
    stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
    framework: 'storybook-solidjs-vite',
});
