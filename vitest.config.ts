import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Node resolves `solid-js` to the server build, which commits store writes
// immediately. The first-render args bug only exists on the client runtime.
const solidClient = fileURLToPath(new URL('./node_modules/solid-js/dist/solid.js', import.meta.url));

export default defineConfig({
    resolve: {
        alias: [
            { find: /^solid-js$/, replacement: solidClient },
        ],
    },
    test: {
        include: ['src/spec/**/*.test.ts', 'src/spec/**/*.test.tsx'],
        globalSetup: ['src/spec/helpers/vitestGlobalSetup.ts'],
    },
});
