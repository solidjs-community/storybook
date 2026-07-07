import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/spec/**/*.test.ts', 'src/spec/**/*.test.tsx'],
        globalSetup: ['src/spec/helpers/vitestGlobalSetup.ts'],
    },
});
