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
    it('emits StrictArgTypes so Controls can infer boolean / enum widgets', () => {
        const doc = buttonDoc({
            label: {
                name: 'label',
                description: 'Button text',
                required: true,
                type: { name: 'string', raw: 'string' },
            },
            disabled: {
                name: 'disabled',
                required: false,
                type: { name: 'boolean', raw: 'boolean' },
            },
            size: {
                name: 'size',
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

        const argTypes = solidComponentDocToArgTypesData(doc);

        expect(typeof argTypes['disabled']?.type).toBe('object');
        expect(argTypes).toMatchObject({
            label: {
                name: 'label',
                description: 'Button text',
                type: { name: 'string', required: true },
            },
            disabled: {
                name: 'disabled',
                type: { name: 'boolean', required: false },
            },
            size: {
                name: 'size',
                type: {
                    name: 'enum',
                    required: false,
                    value: ['small', 'medium', 'large'],
                },
                table: {
                    defaultValue: { summary: 'medium' },
                },
            },
            padding: {
                name: 'padding',
                type: { name: 'number', required: false },
                if: { arg: 'variant', eq: 'solid' },
            },
        });
    });
});
