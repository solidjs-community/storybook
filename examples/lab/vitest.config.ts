import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
    viteConfig,
    defineConfig({
        resolve: {
            dedupe: ['solid-js', '@solidjs/web'],
        },
        optimizeDeps: {
            include: [
                'storybook/internal/csf',
                'storybook/internal/docs-tools',
                '@storybook/global',
            ],
        },
        test: {
            projects: [
                {
                    extends: true,
                    plugins: [
                        storybookTest({
                            configDir: path.join(dirname, '.storybook'),
                        }),
                    ],
                    test: {
                        name: 'storybook',
                        browser: {
                            enabled: true,
                            headless: true,
                            provider: playwright({}),
                            instances: [{ browser: 'chromium' }],
                        },
                    },
                },
            ],
        },
    })
);
