import antfu from '@antfu/eslint-config';

export default antfu(
    {
        // typescript-eslint hard-aborts on TypeScript 7 (no compiler API until ~7.1).
        // With typescript:false antfu ignores **/*.{ts,tsx}; typecheck covers that surface.
        typescript: false,
        // antfu solid preset always imports @typescript-eslint/parser — same crash.
        solid: false,
        // @vitest/eslint-plugin also loads typescript-eslint at import time.
        test: false,
        stylistic: {
            indent: 4,
            quotes: 'single',
            semi: true,
            lessOpinionated: true,
        },
        formatters: true,
        jsx: true,
        markdown: false,
        yaml: false,
    },
    {
        ignores: [
            '**/fixtures',
            '**/node_modules',
            '**/dist',
            '**/build',
            '**/coverage',
            '**/public',
            '**/*.min.[tj]s',
            '**/*.md',
            '**/.github/**',
            // CLI scaffolds — validated in consumer projects after init
            'template/**',
            '**/storybook-static/**',
        ],
    },
    {
        rules: {
            // Node library — `process` global is correct
            'n/prefer-global/process': 'off',
            // Auto-sort of package.json / tsconfig keys is churn without payoff
            'jsonc/sort-keys': 'off',
            // False-positive on docgen prop names like `props['innerText']`
            'unicorn/prefer-dom-node-text-content': 'off',
            // strictest TS4111 needs bracket access; dot-notation autofix breaks typecheck
            'dot-notation': 'off',
            // Handled by import/no-duplicates + separate type/value import style
            'no-duplicate-imports': 'off',
            // TypeScript already covers this
            'no-undef': 'off',
            // Intentional async wrappers matching Storybook APIs
            'require-await': 'off',
            // Style noise; prefer explicit local style
            'prefer-destructuring': 'off',
            // Object key order churn across large config/meta objects
            'perfectionist/sort-objects': 'off',
            // Scripts and ESM entrypoints use top-level await
            'antfu/no-top-level-await': 'off',
            // Allow both `import { type X }` and `import type { X }`
            'import/consistent-type-specifier-style': 'off',

            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'no-debugger': 'warn',
            'no-unused-private-class-members': 'error',
            'no-var': 'error',
            'prefer-const': 'error',
            'prefer-template': 'error',

            'style/no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
            'style/no-trailing-spaces': ['warn', { ignoreComments: true }],
            'style/space-before-function-paren': ['error', 'never'],
            'style/template-curly-spacing': ['error', 'always'],
            'style/indent': ['error', 4],
            'style/quotes': ['error', 'single'],
            'style/semi': ['error', 'always'],
            'style/brace-style': ['error', 'stroustrup'],
            'style/block-spacing': ['error', 'always'],
            'style/quote-props': ['error', 'as-needed'],
            'style/comma-dangle': ['error', {
                arrays: 'always-multiline',
                objects: 'always-multiline',
                imports: 'only-multiline',
                exports: 'only-multiline',
                functions: 'never',
            }],
            'style/object-curly-spacing': ['error', 'always'],
            'style/keyword-spacing': ['error', { before: true, after: true }],
            'style/space-infix-ops': ['error'],
            'style/member-delimiter-style': ['error', {
                multiline: {
                    delimiter: 'semi',
                    requireLast: true,
                },
                singleline: {
                    delimiter: 'semi',
                    requireLast: false,
                },
            }],
            'style/jsx-curly-spacing': [1, {
                when: 'always',
                allowMultiline: true,
            }],
            'style/padding-line-between-statements': [
                'error',
                { blankLine: 'always', prev: 'import', next: '*' },
                { blankLine: 'any', prev: 'import', next: 'import' },
                { blankLine: 'always', prev: '*', next: 'export' },
                { blankLine: 'any', prev: 'export', next: 'export' },
                { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
                { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
                { blankLine: 'always', prev: 'block-like', next: '*' },
                { blankLine: 'any', prev: 'block-like', next: 'block-like' },
                { blankLine: 'always', prev: '*', next: ['return', 'throw', 'break', 'continue'] },
                { blankLine: 'always', prev: 'directive', next: '*' },
                { blankLine: 'any', prev: 'directive', next: 'directive' },
                { blankLine: 'always', prev: ['case', 'default'], next: '*' },
                { blankLine: 'any', prev: ['case', 'default'], next: ['case'] },
                { blankLine: 'never', prev: '*', next: 'break' },
                { blankLine: 'always', prev: 'class', next: '*' },
                { blankLine: 'always', prev: 'function', next: '*' },
            ],
            'style/jsx-indent-props': [2, 'first'],
            'style/no-mixed-operators': [
                'error',
                {
                    groups: [
                        ['+', '-', '*', '/', '%', '**'],
                        ['&', '|', '^', '~', '<<', '>>', '>>>'],
                        ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
                        ['&&', '||', '?:'],
                        ['in', 'instanceof'],
                    ],
                    allowSamePrecedence: true,
                },
            ],

            'perfectionist/sort-imports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: false,
                    groups: [
                        ['value-builtin', 'value-external'],
                        { newlinesBetween: 1 },
                        'value-hash-aliases',
                        { newlinesBetween: 0 },
                        'value-internal',
                        { newlinesBetween: 0 },
                        'value-parent',
                        { newlinesBetween: 0 },
                        'value-sibling',
                        { newlinesBetween: 0 },
                        'value-index',
                        { newlinesBetween: 1 },
                        ['type-builtin', 'type-external'],
                        { newlinesBetween: 0 },
                        'type-hash-aliases',
                        { newlinesBetween: 0 },
                        'type-internal',
                        { newlinesBetween: 0 },
                        'type-parent',
                        { newlinesBetween: 0 },
                        'type-sibling',
                        { newlinesBetween: 0 },
                        'type-index',
                        'unknown',
                    ],
                    customGroups: [
                        {
                            groupName: 'type-hash-aliases',
                            elementNamePattern: '^#',
                            modifiers: ['type'],
                        },
                        {
                            groupName: 'value-hash-aliases',
                            elementNamePattern: '^#',
                            modifiers: ['value'],
                        },
                    ],
                },
            ],
            'perfectionist/sort-named-imports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: false,
                    groups: [
                        'value-import',
                        'type-import',
                    ],
                },
            ],
            'perfectionist/sort-exports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: false,
                    groups: [
                        'value-export',
                        'type-export',
                    ],
                },
            ],
            'perfectionist/sort-named-exports': [
                'error',
                {
                    type: 'alphabetical',
                    order: 'asc',
                    ignoreCase: false,
                    groups: [
                        'value-export',
                        'type-export',
                    ],
                },
            ],

            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],

            'import/first': 'error',
            'import/no-duplicates': 'error',
            'import/no-mutable-exports': 'error',
            'import/no-named-default': 'error',
        },
    },
    {
        files: ['**/*.json', '**/*.json5'],
        rules: {
            'jsonc/indent': ['error', 4],
        },
    }
);
