import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Node resolves `solid-js` to the server build, which commits store writes
// immediately. The first-render args bug only exists on the client runtime.
// Only the Solid 2 renderer and its mount test need that runtime. Other specs
// write signals inside `createRoot`, which the client build rejects.
const solidClient = fileURLToPath(new URL('./node_modules/solid-js/dist/solid.js', import.meta.url));
const solidClientImporters = /(?:^|\/)(?:solid2\.ts|solid2-mount\.test\.ts)$/;

export default defineConfig({
    plugins: [
        {
            name: 'solid2-client-runtime',
            enforce: 'pre',
            resolveId(source, importer) {
                if (source !== 'solid-js' || !importer || !solidClientImporters.test(importer)) {
                    return null;
                }

                return solidClient;
            },
        },
    ],
    test: {
        include: ['src/spec/**/*.test.ts', 'src/spec/**/*.test.tsx'],
        globalSetup: ['src/spec/helpers/vitestGlobalSetup.ts'],
    },
});
