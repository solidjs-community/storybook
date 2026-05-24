/**
 * Solid 2 entry
 *
 * @example
 * ```ts
 * import type { StorybookConfig } from 'storybook-solidjs-vite/next';
 * import { definePreview, Meta, StoryObj } from 'storybook-solidjs-vite/next';
 *
 * // .storybook/main.ts
 * framework: { name: 'storybook-solidjs-vite/next' }
 * ```
 */
export * from './framework/node';
export * from './renderer/v2';
export type { FrameworkConfig, FrameworkOptions, SolidVersion, StorybookConfig } from './framework/types';
