import { global } from '@storybook/global';

if (global.window) {
    global.window.STORYBOOK_ENV = 'solid';
}

export { definePreview } from './preview';
export * from './public-api';
