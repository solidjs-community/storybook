import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsdown';

/** `solid-js-next` is a local Solid 2 alias; published output must import `solid-js`. */
function rewriteSolidRuntimeImports(dir = 'dist') {
    for (const entry of readdirSync(dir)) {
        const filePath = join(dir, entry);
        const stats = statSync(filePath);

        if (stats.isDirectory()) {
            rewriteSolidRuntimeImports(filePath);
            continue;
        }

        if (!/\.(?:js|d\.ts)$/.test(entry)) {
            continue;
        }

        const source = readFileSync(filePath, 'utf8');
        const next = source
            .replaceAll("'solid-js-next'", "'solid-js'")
            .replaceAll('"solid-js-next"', '"solid-js"');

        if (next !== source) {
            writeFileSync(filePath, next);
        }
    }
}

export default defineConfig((options) => ({
    entry: {
        index: 'src/index.ts',
        node: 'src/node.ts',
        renderer: 'src/renderer/index.ts',
        'framework/preset': 'src/framework/preset.ts',
        'renderer/solid-legacy': 'src/renderer/solid-legacy.ts',
        'renderer/solid-next': 'src/renderer/solid-next.ts',
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
        // Peers and `dependencies` are already external. These two are not:
        // `solid-js-next` is a dev alias, and the root entry self-imports the
        // published Solid 1 renderer subpath instead of inlining it.
        neverBundle: [
            'solid-js-next',
            'storybook-solidjs-vite/renderer/solid-legacy',
        ],
    },
    sourcemap: true,
    hooks: {
        'build:done': () => {
            rewriteSolidRuntimeImports('dist');
        },
    },
}));
