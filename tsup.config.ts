import { defineConfig } from 'tsup';

import { rewriteSolidRuntimeImports } from './scripts/rewrite-solid-imports';

export default defineConfig((options) => {
    return {
        entry: {
            index: 'src/index.ts',
            node: 'src/node.ts',
            renderer: 'src/renderer/index.ts',
            playwright: 'src/playwright.ts',
            'framework/preset': 'src/framework/preset.ts',
            'renderer/solid-legacy': 'src/renderer/solid-legacy.ts',
            'renderer/solid-next': 'src/renderer/solid-next.ts',
            'renderer/docs': 'src/renderer/docs.ts',
            'internal/docgen-worker': 'src/internal/componentManifest/docgen/docgen-worker.ts',
        },
        format: ['esm'],
        outDir: 'dist',
        clean: true,
        dts: false,
        tsconfig: 'tsconfig.json',
        external: [
            '@storybook/builder-vite',
            '@storybook/global',
            '@volar/language-core',
            '@volar/typescript',
            /^@solidjs(?:\/|$)/,
            /^solid-js(?:-next)?(?:\/|$)/,
            /^storybook\//,
            'storybook-solidjs-vite/renderer/solid-legacy',
            '@typescript/typescript6',
            'vite-plugin-solid',
        ],
        sourcemap: true,
        treeshake: !options.watch,
        // Watch builds only emit JS — rewrite Solid 2 import aliases for local runs.
        onSuccess: async() => {
            if (options.watch) {
                rewriteSolidRuntimeImports('dist');
            }
        },
    };
});
