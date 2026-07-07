import { baseConfig, combine, solidConfig, typescriptConfig } from '@flexbe/eslint-config';

export default combine(
    {
        // CLI scaffolds — not in tsconfig (validated in consumer projects after init)
        // examples/lab has its own eslint.config.mjs + tsconfig
        ignores: ['template/**', 'examples/**'],
    },
    baseConfig(),
    solidConfig(),
    typescriptConfig({
        tsconfigPath: './tsconfig.json',
    })
);
