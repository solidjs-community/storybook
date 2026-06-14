import { baseConfig, combine, solidConfig, typescriptConfig } from '@flexbe/eslint-config';

export default combine(
    {
        // CLI scaffolds — not in tsconfig (validated in consumer projects after init)
        ignores: ['template/**'],
    },
    baseConfig(),
    solidConfig(),
    typescriptConfig({
        tsconfigPath: './tsconfig.json',
    })
);
