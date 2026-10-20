import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Node resolves `solid-js-next` to the server build, which commits store writes
// immediately. The first-render args bug only exists on the client runtime.
const solidNextClient = fileURLToPath(new URL('./node_modules/solid-js-next/dist/solid.js', import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            'solid-js-next': solidNextClient,
        },
    },
    test: {
        include: ['src/spec/**/*.test.ts', 'src/spec/**/*.test.tsx'],
        globalSetup: ['src/spec/helpers/vitestGlobalSetup.ts'],
    },
});
