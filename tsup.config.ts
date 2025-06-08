import { solidPlugin } from 'esbuild-plugin-solid';
import { defineConfig } from 'tsup';

export default defineConfig((options) => {
    return {
        entry: [
            'src/index.ts',
            'src/preset.ts',
            'src/renderer/index.ts',
            'src/renderer/preset.ts',
            'src/renderer/entry-preview.ts',
            'src/renderer/entry-preview-docs.ts',
            'src/renderer/entry-preview-argtypes.ts',
        ],
        format: ['esm', 'cjs'],
        outDir: 'dist',
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
