/**
 * Stable import specifier for `storybook-solidjs-vite/renderer/solid`.
 *
 * Not used at runtime in Storybook:
 * - `exports.node` serves `main.ts` without loading the renderer
 * - `previewAnnotations` preset loads `solid-next` or `solid-legacy` directly
 * - `viteFinal` aliases this path to the matching renderer for `definePreview`
 */
export {};
