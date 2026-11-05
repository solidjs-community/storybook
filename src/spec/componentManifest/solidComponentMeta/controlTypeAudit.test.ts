import ts from '@typescript/typescript6';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { convert, type DocgenInfo } from 'storybook/internal/docs-tools';
import { afterEach, describe, expect, it } from 'vitest';

import { SolidComponentMetaProject } from '../../../internal/componentManifest/solidComponentMeta/SolidComponentMetaProject';
import {
    inferControlType,
    recommendedControlMatchers,
    type ExpectedControl,
} from '../../helpers/controlScenario';
import {
    cleanupSpecTempDirs,
    createSpecTempDir,
    defaultCompilerOptions,
} from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

interface AuditCase {
    prop: string;
    typeSource: string;
    expected: ExpectedControl;
    matchers?: typeof recommendedControlMatchers;
}

function auditProps(cases: AuditCase[], preamble = '') {
    const dir = createSpecTempDir(tempDirs);
    const filePath = join(dir, 'Audit.tsx');
    const props = cases.map(({ prop, typeSource }) => `  ${ prop }: ${ typeSource };`).join('\n');

    writeFileSync(
        filePath,
        `${ preamble }\ninterface Props {\n${ props }\n}\nexport function Audit(p: Props) { return null; }\n`
    );

    const project = new SolidComponentMetaProject(
        ts,
        {
            options: defaultCompilerOptions(),
            fileNames: [filePath],
            errors: [],
        },
        undefined,
        new Map()
    );

    const doc = project.extractFromComponentFile(filePath, 'Audit');

    project.dispose();

    return cases.map(({ prop, expected, matchers }) => {
        const serialized = doc?.props[prop];

        if (!serialized) {
            return { prop, expected, actual: 'MISSING' as const, serialized: undefined, sbType: undefined };
        }

        const sbType = convert({
            type: {
                name: serialized.type.name,
                raw: serialized.type.raw ?? serialized.type.name,
                ...(serialized.type.value !== undefined ? { value: serialized.type.value } : {}),
            },
            required: serialized.required,
            description: serialized.description ?? '',
            defaultValue: serialized.defaultValue ?? { value: '' },
        } satisfies DocgenInfo);

        return {
            prop,
            expected,
            actual: inferControlType(sbType, { propName: prop, matchers }),
            serialized: serialized.type,
            sbType,
        };
    });
}

const SHARED_PREAMBLE = `
type Size = 'sm' | 'md' | 'lg';
enum SizeEnum { Sm = 'sm', Md = 'md', Lg = 'lg' }
enum NumEnum { A, B, C }
enum ManyEnum { A = 'a', B = 'b', C = 'c', D = 'd', E = 'e', F = 'f' }
const SIDES = { left: 'l', right: 'r', center: 'c' } as const;
type Side = typeof SIDES[keyof typeof SIDES];
`;

const TEMPLATE_LITERAL_TYPE = ['`', '$' + '{number}px', '` | "auto"'].join('');

describe('control type audit — typical prop patterns (sbType → default inferControls)', () => {
    const cases: AuditCase[] = [
        // Primitives
        { prop: 'label', typeSource: 'string', expected: 'text' },
        { prop: 'optionalLabel', typeSource: 'string | undefined', expected: 'text' },
        { prop: 'count', typeSource: 'number', expected: 'number' },
        { prop: 'optionalCount', typeSource: 'number | undefined', expected: 'number' },
        { prop: 'disabled', typeSource: 'boolean', expected: 'boolean' },
        { prop: 'optionalDisabled', typeSource: 'boolean | undefined', expected: 'boolean' },

        // String literal unions → radio
        { prop: 'size', typeSource: '\'sm\' | \'md\' | \'lg\'', expected: 'radio' },
        { prop: 'optionalSize', typeSource: '\'sm\' | \'md\' | \'lg\' | undefined', expected: 'radio' },
        { prop: 'nullableSize', typeSource: '\'idle\' | \'done\' | null | undefined', expected: 'radio' },

        // Number literal unions → radio
        { prop: 'level', typeSource: '1 | 2 | 3', expected: 'radio' },
        { prop: 'optionalLevel', typeSource: '1 | 2 | 3 | undefined', expected: 'radio' },

        // Boolean literal unions
        { prop: 'flag', typeSource: 'true | false | undefined', expected: 'boolean' },
        { prop: 'checked', typeSource: 'true | undefined', expected: 'boolean' },

        // Large enum → select
        { prop: 'many', typeSource: '\'a\' | \'b\' | \'c\' | \'d\' | \'e\' | \'f\'', expected: 'select' },

        // Type aliases & TS enums
        { prop: 'aliasedSize', typeSource: 'Size', expected: 'radio' },
        { prop: 'enumSize', typeSource: 'SizeEnum', expected: 'radio' },
        { prop: 'numEnumSize', typeSource: 'NumEnum', expected: 'radio' },
        { prop: 'manyEnum', typeSource: 'ManyEnum', expected: 'select' },
        { prop: 'side', typeSource: 'Side', expected: 'radio' },

        // Widened unions → text (not radio)
        { prop: 'value', typeSource: 'string | \'a\' | \'b\'', expected: 'text' },

        // Nullable primitives
        { prop: 'nullableText', typeSource: 'string | null', expected: 'text' },
        { prop: 'nullableNumber', typeSource: 'number | null | undefined', expected: 'number' },

        // Arrays → object control
        { prop: 'tags', typeSource: 'string[]', expected: 'object' },
        { prop: 'readonlyTags', typeSource: 'readonly string[]', expected: 'object' },
        { prop: 'literalTags', typeSource: '(\'a\' | \'b\')[]', expected: 'object' },
        { prop: 'items', typeSource: 'number[]', expected: 'object' },

        // Objects / records → object control
        { prop: 'style', typeSource: '{ color: string; margin: number }', expected: 'object' },
        { prop: 'map', typeSource: 'Record<string, string>', expected: 'object' },

        // Functions → no control
        { prop: 'onClick', typeSource: '(event: MouseEvent) => void', expected: 'none' },
        { prop: 'optionalHandler', typeSource: '(() => void) | undefined', expected: 'none' },

        // Loose types
        { prop: 'data', typeSource: 'any', expected: 'object' },
        { prop: 'unknownData', typeSource: 'unknown', expected: 'object' },

        // Strings stay text unless preview matchers are configured (Storybook default matchers = {})
        { prop: 'backgroundColor', typeSource: 'string | undefined', expected: 'text' },
        { prop: 'createdAt', typeSource: 'string | undefined', expected: 'text' },
        { prop: 'className', typeSource: 'string | undefined', expected: 'text' },
    ];

    it.each(cases)('$prop ($typeSource) → $expected control', ({ prop, typeSource, expected, matchers }) => {
        const auditCase: AuditCase = { prop, typeSource, expected };

        if (matchers) {
            auditCase.matchers = matchers;
        }

        const [result] = auditProps([auditCase], SHARED_PREAMBLE);

        expect(result?.actual, JSON.stringify(result?.serialized)).toBe(expected);
    });
});

describe('control type audit — with recommended preview matchers', () => {
    it.each([
        { prop: 'backgroundColor', typeSource: 'string | undefined', expected: 'color' as const },
        { prop: 'startDate', typeSource: 'string | undefined', expected: 'date' as const },
    ])('$prop → $expected when matchers configured', ({ prop, typeSource, expected }) => {
        const [result] = auditProps(
            [{ prop, typeSource, expected, matchers: recommendedControlMatchers }],
            SHARED_PREAMBLE
        );

        expect(result?.actual, JSON.stringify(result?.serialized)).toBe(expected);
    });
});

describe('control type audit — discriminated unions', () => {
    it.each([
        {
            prop: 'mode',
            typeSource: '{ mode: \'inline\' } | { mode: \'block\' }',
            expected: 'radio' as const,
        },
        {
            prop: 'kind',
            typeSource: 'Kind',
            preamble: 'type Kind = { kind: \'foo\' } | { kind: \'bar\' };',
            expected: 'radio' as const,
        },
        {
            prop: 'config',
            typeSource: '{ type: \'a\'; value: string } | { type: \'b\'; value: number }',
            expected: 'object' as const,
        },
    ])('$prop → $expected', ({ prop, typeSource, expected, preamble = '' }) => {
        const [result] = auditProps([{ prop, typeSource, expected }], preamble);

        expect(result?.actual, JSON.stringify(result?.serialized)).toBe(expected);
    });
});

describe('control type audit — extended patterns (documented behavior)', () => {
    it.each([
        { prop: 'strNum', typeSource: 'string | number', expected: 'text' as const },
        { prop: 'bigintVal', typeSource: 'bigint', expected: 'object' as const },
        { prop: 'sym', typeSource: 'symbol', expected: 'none' as const },
        { prop: 'tuple', typeSource: '[string, number]', expected: 'object' as const },
        { prop: 'objUnion', typeSource: '{ kind: \'a\' } | { kind: \'b\' }', expected: 'radio' as const },
        {
            prop: 'intersection',
            typeSource: '{ a: string } & { b: number }',
            expected: 'object' as const,
        },
        { prop: 'plainObject', typeSource: '{ a: string; b: number }', expected: 'object' as const },
        { prop: 'template', typeSource: TEMPLATE_LITERAL_TYPE, expected: 'object' as const },
        { prop: 'mixed', typeSource: '\'a\' | \'b\' | 1 | 2', expected: 'radio' as const },
        { prop: 'five', typeSource: '\'1\' | \'2\' | \'3\' | \'4\' | \'5\'', expected: 'radio' as const },
        { prop: 'six', typeSource: '\'1\' | \'2\' | \'3\' | \'4\' | \'5\' | \'6\'', expected: 'select' as const },
        { prop: 'constArr', typeSource: 'Color', expected: 'radio' as const },
    ])('$prop → $expected', ({ prop, typeSource, expected }) => {
        const preamble = `
const COLORS = ['red', 'green', 'blue'] as const;
type Color = typeof COLORS[number];
`;
        const [result] = auditProps([{ prop, typeSource, expected }], preamble);

        expect(result?.actual, JSON.stringify(result?.serialized)).toBe(expected);
    });
});
