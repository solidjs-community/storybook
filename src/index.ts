import { createSolidDefinePreview } from './preview/define-preview';
import * as solidAnnotations from './renderer/solid-1';

export * from './framework/public-api';
export * from './preview/public-api';
export const definePreview = createSolidDefinePreview(solidAnnotations as never);
