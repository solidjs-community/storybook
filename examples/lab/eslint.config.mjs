import { baseConfig, combine, solidConfig, typescriptConfig } from '@flexbe/eslint-config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labDir = dirname(fileURLToPath(import.meta.url));

export default combine(
    {
        ignores: ['node_modules/**', 'storybook-static/**'],
    },
    baseConfig(),
    solidConfig(),
    typescriptConfig({
        tsconfigPath: join(labDir, 'tsconfig.json'),
    })
);
