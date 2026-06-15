import { describe, expect, it } from 'vitest';

import { solidComponentDocToDocgenInfo } from './toDocgenInfo';

import type { SolidComponentDoc } from './types';

describe('solidComponentDocToDocgenInfo', () => {
    it('preserves enum type values for storybook docs-tools', () => {
        const doc: SolidComponentDoc = {
            exportName: 'Button',
            filePath: 'Button.tsx',
            props: {
                size: {
                    name: 'size',
                    required: false,
                    type: {
                        name: 'enum',
                        raw: '"small" | "medium" | "large"',
                        value: [
                            { value: '"small"' },
                            { value: '"medium"' },
                            { value: '"large"' },
                        ],
                    },
                },
            },
        };

        expect(solidComponentDocToDocgenInfo(doc).props['size']?.type).toEqual({
            name: 'enum',
            raw: '"small" | "medium" | "large"',
            value: [
                { value: '"small"' },
                { value: '"medium"' },
                { value: '"large"' },
            ],
        });
    });
});
