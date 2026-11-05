import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Node resolves `solid-js` and `@solidjs/web` to their server builds. The server
// `solid-js` commits store writes immediately (the first-render args bug only
// exists on the client runtime), and the server `render` throws. Only the Solid 2
// renderer, its mount test, and the client `@solidjs/web` it imports need the
// client runtime. Other specs write signals inside `createRoot`, which the client
// build rejects.
const solidClient = {
    'solid-js': fromRoot('./node_modules/solid-js/dist/solid.js'),
    '@solidjs/web': fromRoot('./node_modules/@solidjs/web/dist/web.js'),
};
const solidClientImporters = /(?:^|\/)(?:solid2\.ts|solid2-mount\.test\.ts|@solidjs\/web\/dist\/web\.js)$/;

export default defineConfig({
    plugins: [
        {
            name: 'solid2-client-runtime',
            enforce: 'pre',
            resolveId(source, importer) {
                if (!Object.hasOwn(solidClient, source) || !importer || !solidClientImporters.test(importer)) {
                    return null;
                }

                return solidClient[source as keyof typeof solidClient];
            },
        },
    ],
    resolve: {
        // Same self-import as `paths` in tsconfig.json. In Storybook the preset aliases it.
        alias: {
            'storybook-solidjs-vite/renderer/preview-addon': fromRoot('./src/renderer/preview-addon.ts'),
        },
    },
    test: {
        include: ['src/spec/**/*.test.ts', 'src/spec/**/*.test.tsx'],
        globalSetup: ['src/spec/helpers/vitestGlobalSetup.ts'],
        // Inline the client `@solidjs/web` so its `solid-js` import goes through the plugin above.
        server: {
            deps: {
                inline: [/@solidjs\/web\/dist\/web\.js$/],
            },
        },
    },
});
