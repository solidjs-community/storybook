import { global } from '@storybook/global';

const { window: globalWindow } = global as any;

globalWindow.STORYBOOK_ENV = 'solid';
