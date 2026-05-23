import { defineConfig } from 'tsup';

export default defineConfig((options) => {
    return {
        entry: {
            index: 'src/index.ts',
            'framework/preset': 'src/framework/preset.ts',
            'framework/node': 'src/framework/node.ts',
            'renderer/playwright': 'src/renderer/playwright.ts',
            'renderer/index': 'src/renderer/index.ts',
            'renderer/preview': 'src/renderer/preview.ts',
            'renderer/preset': 'src/renderer/preset.ts',
            'renderer/docs/entry-preview-argtypes': 'src/renderer/docs/entry-preview-argtypes.ts',
            'renderer/docs/entry-preview': 'src/renderer/docs/entry-preview.ts',
            'renderer/v1/entry-preview': 'src/renderer/v1/entry-preview.ts',
        },
        format: ['esm'],
        outDir: 'dist',
        clean: true,
        dts: {
            resolve: true,
        },
        tsconfig: 'tsconfig.json',
        external: [
            '@storybook/builder-vite',
            '@storybook/global',
            /^@solidjs\//,
            'solid-js',
            /^solid-js\//,
            /^storybook\//,
            'vite-plugin-solid',
        ],
        sourcemap: true,
        treeshake: !options.watch,
    };
});
