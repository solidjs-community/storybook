import { baseConfig, combine, solidConfig, typescriptConfig } from '@flexbe/eslint-config';

export default combine(
    baseConfig(),
    solidConfig(),
    typescriptConfig({
        tsconfigPath: './tsconfig.json',
    })
);
