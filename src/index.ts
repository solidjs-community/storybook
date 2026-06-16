import { previewAddon } from 'storybook-solidjs-vite/renderer/solid-legacy';

import { createSolidDefinePreview, type SolidDefinePreview } from './preview/define-preview';

export * from './framework/public-api';
export * from './preview/public-api';

export const definePreview: SolidDefinePreview = createSolidDefinePreview(previewAddon);
