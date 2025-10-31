import { solidPlugin } from 'esbuild-plugin-solid';
import { defineConfig } from 'tsup';

export default defineConfig((options) => {
    return {
        entry: [
            // framework
            'src/index.ts',
            'src/preset.ts',
            'src/node/index.ts',
            // renderer
            'src/renderer/index.ts',
            'src/renderer/preview.ts',
            'src/renderer/preset.ts',
            'src/renderer/entry-preview.ts',
            'src/renderer/entry-preview-argtypes.ts',
            'src/renderer/entry-preview-docs.ts',
        ],
        format: ['esm'],
        outDir: 'dist',
        clean: true,
        dts: false,
        external: [
            '@storybook/builder-vite',
        ],
        jsx: 'preserve',
        sourcemap: true,
        treeshake: !options.watch,
        esbuildPlugins: [solidPlugin()],
    };
});
