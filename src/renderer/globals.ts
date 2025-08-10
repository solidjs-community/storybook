import { global } from '@storybook/global';

const { window: globalWindow } = global as any;

if (globalWindow) {
    globalWindow.STORYBOOK_ENV = 'solid';
}
