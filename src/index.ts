/** Default Solid 1 renderer; kept external in tsup. Storybook `viteFinal` aliases this to `renderer/solid-next` when needed. */
import * as solidAnnotations from 'storybook-solidjs-vite/renderer/solid';

import { createSolidDefinePreview, type SolidDefinePreview } from './preview/define-preview';

export * from './framework/public-api';
export * from './preview/public-api';

export const definePreview: SolidDefinePreview = createSolidDefinePreview(solidAnnotations);
