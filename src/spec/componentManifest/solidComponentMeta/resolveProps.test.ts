import { convert, type DocgenInfo } from 'storybook/internal/docs-tools';
import { afterEach, describe, expect, it } from 'vitest';

import { solidComponentDocToDocgenInfo } from '../../../internal/componentManifest/toDocgenInfo';
import {
    cleanupSpecTempDirs,
    createComponentProject,
} from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

function extractPropType(source: string, propName: string, exportName = 'Example') {
    const { filePath, project } = createComponentProject({ tempDirs, source, exportName });
    const doc = project.extractFromComponentFile(filePath, exportName);

    project.dispose();

    return doc?.props[propName]?.type;
}

function toStorybookSbType(source: string, propName: string, exportName = 'Example') {
    const { filePath, exportName: name, project } = createComponentProject({ tempDirs, source, exportName });
    const doc = project.extractFromComponentFile(filePath, name);

    project.dispose();

    if (!doc) {
        return undefined;
    }

    const docgenInfo = solidComponentDocToDocgenInfo(doc);
    const prop = docgenInfo.props[propName];

    if (!prop) {
        return undefined;
    }

    return convert({
        type: prop.type,
        required: prop.required ?? false,
        description: prop.description ?? '',
        defaultValue: prop.defaultValue ?? { value: '' },
    } satisfies DocgenInfo);
}

describe('serializeType via SolidComponentMetaProject', () => {
    it('serializes inline string unions as enum for Storybook radio controls', () => {
        expect(extractPropType(
            `interface Props { size?: 'small' | 'medium' | 'large'; }
             export function Example(props: Props) { return null; }`,
            'size'
        )).toEqual({
            name: 'enum',
            raw: '"small" | "medium" | "large"',
            value: [
                { value: '"small"' },
                { value: '"medium"' },
                { value: '"large"' },
            ],
        });

        expect(toStorybookSbType(
            `interface Props { size?: 'small' | 'medium' | 'large'; }
             export function Example(props: Props) { return null; }`,
            'size'
        )).toEqual({
            name: 'enum',
            raw: '"small" | "medium" | "large"',
            value: ['small', 'medium', 'large'],
        });
    });

    it('serializes Volar-style optional booleans as boolean, not boolean | undefined', () => {
        expect(extractPropType(
            `interface Props { primary?: boolean; }
             export function Example(props: Props) { return null; }`,
            'primary'
        )).toEqual({
            name: 'boolean',
            raw: 'boolean | undefined',
        });
    });

    it('serializes true | false unions as boolean', () => {
        expect(extractPropType(
            `interface Props { flag?: true | false; }
             export function Example(props: Props) { return null; }`,
            'flag'
        )?.name).toBe('boolean');
    });

    it('serializes optional true literal as boolean', () => {
        expect(extractPropType(
            `interface Props { checked?: true; }
             export function Example(props: Props) { return null; }`,
            'checked'
        )?.name).toBe('boolean');
    });

    it('keeps string literal members when null is part of the union', () => {
        expect(extractPropType(
            `interface Props { status?: 'idle' | 'done' | null; }
             export function Example(props: Props) { return null; }`,
            'status'
        )).toEqual({
            name: 'enum',
            raw: '"idle" | "done"',
            value: [
                { value: '"idle"' },
                { value: '"done"' },
            ],
        });
    });

    it('parses string unions into enum docgen values and Storybook sbType', () => {
        expect(toStorybookSbType(
            `interface Props { align?: 'left' | 'center' | 'right'; }
             export function Example(props: Props) { return null; }`,
            'align'
        )).toEqual({
            name: 'enum',
            raw: '"left" | "center" | "right"',
            value: ['left', 'center', 'right'],
        });
    });

    it('serializes nullable string and number unions as base primitives', () => {
        expect(extractPropType(
            `interface Props {
               label: string | undefined;
               count: number | null | undefined;
             }
             export function Example(props: Props) { return null; }`,
            'label'
        )?.name).toBe('string');

        expect(extractPropType(
            `interface Props {
               label: string | undefined;
               count: number | null | undefined;
             }
             export function Example(props: Props) { return null; }`,
            'count'
        )?.name).toBe('number');
    });

    it('serializes arrays with array docgen name', () => {
        expect(extractPropType(
            `interface Props { tags: string[]; }
             export function Example(props: Props) { return null; }`,
            'tags'
        )?.name).toBe('array');
    });

    it('serializes readonly arrays with array docgen name', () => {
        expect(extractPropType(
            `interface Props { tags: readonly string[]; }
             export function Example(props: Props) { return null; }`,
            'tags'
        )?.name).toBe('array');
    });

    it('resolves props from generic Component<Props> aliases without call signatures', () => {
        expect(extractPropType(
            `type Component<Props> = (props: Props) => null;
             interface ButtonProps { size?: 'small' | 'medium' | 'large'; }
             export const Example: Component<ButtonProps> = () => null;`,
            'size',
            'Example'
        )?.name).toBe('enum');
    });

    it('serializes discriminated union object types when prop name matches the discriminant', () => {
        expect(extractPropType(
            `interface Props {
               mode: { mode: 'inline' } | { mode: 'block' };
             }
             export function Example(props: Props) { return null; }`,
            'mode'
        )).toEqual({
            name: 'enum',
            raw: '"inline" | "block"',
            value: [
                { value: '"inline"' },
                { value: '"block"' },
            ],
        });
    });

    it('serializes discriminated unions behind a type alias', () => {
        expect(extractPropType(
            `type Kind = { kind: 'foo' } | { kind: 'bar' } | { kind: 'baz' };
             interface Props { kind: Kind; }
             export function Example(props: Props) { return null; }`,
            'kind'
        )).toEqual({
            name: 'enum',
            raw: '"foo" | "bar" | "baz"',
            value: [
                { value: '"foo"' },
                { value: '"bar"' },
                { value: '"baz"' },
            ],
        });
    });

    it('keeps object control for multi-field discriminated union members', () => {
        expect(extractPropType(
            `interface Props {
               config: { type: 'a'; value: string } | { type: 'b'; value: number };
             }
             export function Example(props: Props) { return null; }`,
            'config'
        )?.name).not.toBe('enum');
    });

    it('keeps object control for multi-field discriminated union aliases', () => {
        expect(extractPropType(
            `type Variant =
               | { variant: 'primary'; label: string }
               | { variant: 'secondary'; label: string };
             interface Props { payload: Variant; }
             export function Example(props: Props) { return null; }`,
            'payload'
        )?.name).not.toBe('enum');
    });

    it('normalizes mergeable object intersections to the same shape as a plain object type', () => {
        const objectType = extractPropType(
            `interface Props { value: { a: string; b: number }; }
             export function Example(props: Props) { return null; }`,
            'value'
        );
        const intersectionType = extractPropType(
            `interface Props { value: { a: string } & { b: number }; }
             export function Example(props: Props) { return null; }`,
            'value'
        );
        const aliasedIntersectionType = extractPropType(
            `type Inter = { a: string } & { b: number };
             interface Props { value: Inter; }
             export function Example(props: Props) { return null; }`,
            'value'
        );

        expect(intersectionType).toEqual({
            name: '{ a: string; b: number; }',
            raw: '{ a: string; b: number; }',
        });
        expect(intersectionType).toEqual(objectType);
        expect(aliasedIntersectionType).toEqual(objectType);
    });

    it('maps a single typeof const indexed literal to enum', () => {
        expect(extractPropType(
            `const MODES = { only: 'dark' as const };
             interface Props { mode: typeof MODES['only']; }
             export function Example(props: Props) { return null; }`,
            'mode'
        )?.name).toBe('enum');
    });
});
