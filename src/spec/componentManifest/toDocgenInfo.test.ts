import { describe, expect, it } from 'vitest';

import { solidComponentDocToArgTypesData, solidComponentDocToDocgenInfo } from '../../internal/componentManifest/toDocgenInfo';

import type { SolidComponentDoc } from '../../internal/componentManifest/types';

function buttonDoc(props: SolidComponentDoc['props']): SolidComponentDoc {
    return {
        exportName: 'Button',
        filePath: 'Button.tsx',
        props,
    };
}

describe('solidComponentDocToDocgenInfo', () => {
    it('preserves enum values, metadata, and conditional visibility', () => {
        const doc = buttonDoc({
            size: {
                name: 'size',
                description: 'Visual size of the button.',
                required: false,
                defaultValue: { value: 'medium' },
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
            padding: {
                name: 'padding',
                required: false,
                if: { arg: 'variant', eq: 'solid' },
                type: { name: 'number', raw: 'number' },
            },
        });

        expect(solidComponentDocToDocgenInfo(doc).props['size']).toMatchObject({
            description: 'Visual size of the button.',
            defaultValue: { value: 'medium' },
            type: {
                name: 'enum',
                raw: '"small" | "medium" | "large"',
                value: [
                    { value: '"small"' },
                    { value: '"medium"' },
                    { value: '"large"' },
                ],
            },
        });
        expect(solidComponentDocToDocgenInfo(doc).props['padding']?.if).toEqual({ arg: 'variant', eq: 'solid' });
    });
});

describe('solidComponentDocToArgTypesData', () => {
    it('maps prop names, types, required flags, and descriptions for manifests', () => {
        const doc = buttonDoc({
            label: {
                name: 'label',
                description: 'Button text',
                required: true,
                type: { name: 'string', raw: 'string' },
            },
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
        });

        expect(solidComponentDocToArgTypesData(doc)).toEqual({
            label: {
                name: 'label',
                type: 'string',
                required: true,
                description: 'Button text',
            },
            size: {
                name: 'size',
                type: 'enum',
                required: false,
                description: undefined,
            },
        });
    });
});
