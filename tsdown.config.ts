import { defineConfig } from 'tsdown';

import { rewriteSolidRuntimeImports } from './scripts/rewrite-solid-imports';

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
        node: 'src/node.ts',
        renderer: 'src/renderer/index.ts',
        'framework/preset': 'src/framework/preset.ts',
        'renderer/solid1': 'src/renderer/solid1.ts',
        'renderer/solid2': 'src/renderer/solid2.ts',
        'renderer/preview-addon': 'src/renderer/preview-addon.ts',
        'renderer/docs': 'src/renderer/docs.ts',
        'internal/docgen-worker': 'src/internal/componentManifest/docgen/docgen-worker.ts',
    },
    format: ['esm'],
    outDir: 'dist',
    clean: true,
    dts: !options.watch,
    tsconfig: 'tsconfig.json',
    fixedExtension: false,
    deps: {
        onlyBundle: false,
        // Peers and `dependencies` are already external. These are not:
        // `solid-js-legacy` is a dev alias (including `/store` and `/web`),
        // and the root entry self-imports published renderer subpaths.
        neverBundle: [
            /^solid-js-legacy(?:\/|$)/,
            'storybook-solidjs-vite/renderer/solid1',
            'storybook-solidjs-vite/renderer/preview-addon',
        ],
    },
    sourcemap: true,
    hooks: {
        'build:done': () => {
            rewriteSolidRuntimeImports('dist');
        },
    },
}));
