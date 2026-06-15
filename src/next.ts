/**
 * Solid 2 entry
 *
 * @example
 * ```ts
 * import { definePreview, Meta, StoryObj } from 'storybook-solidjs-vite/next';
 * ```
 */
import { createSolidDefinePreview } from './preview/define-preview';
import * as solidAnnotations from './renderer/solid-2';

export * from './framework/public-api';
export * from './preview/public-api';
export const definePreview = createSolidDefinePreview(solidAnnotations as never);
