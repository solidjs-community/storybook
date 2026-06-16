import { previewAddon } from 'storybook-solidjs-vite/renderer/solid';

import { createSolidDefinePreview, type SolidDefinePreview } from './preview/define-preview';

export * from './framework/public-api';
export * from './preview/public-api';

export const definePreview: SolidDefinePreview = createSolidDefinePreview(previewAddon);
