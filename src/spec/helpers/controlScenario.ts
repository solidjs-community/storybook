import ts from '@typescript/typescript6';
import { join } from 'node:path';
import { convert, type DocgenInfo } from 'storybook/internal/docs-tools';
import { expect } from 'vitest';

import { SolidComponentMetaProject } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaProject';
import {
    createSpecTempDir,
    defaultCompilerOptions,
    writeSpecFiles,
} from './tempProject';

import type { SerializedPropIf, SerializedPropType, SolidComponentDoc } from '../../internal/componentManifest/types';

export type ExpectedControl
    = | 'boolean'
        | 'text'
        | 'number'
        | 'radio'
        | 'select'
        | 'object'
        | 'color'
        | 'date'
        | 'none'
        | 'MISSING'
        | 'NO_SBTYPE';

export interface ControlMatchers {
    color?: RegExp;
    date?: RegExp;
}

/** Same defaults as `src/renderer/docs.ts` controlMatchers. */
export const recommendedControlMatchers: ControlMatchers = {
    color: /(?:background|color)$/i,
    date: /Date$/,
};

export function inferControlType(
    sbType: ReturnType<typeof convert> | null,
    options: { propName?: string; matchers?: ControlMatchers | undefined } = {}
): ExpectedControl {
    if (!sbType) {
        return options.matchers ? 'NO_SBTYPE' : 'object';
    }

    const propName = options.propName ?? '';

    if (options.matchers?.color?.test(propName) && sbType.name === 'string') {
        return 'color';
    }

    if (options.matchers?.date?.test(propName) && sbType.name === 'string') {
        return 'date';
    }

    switch (sbType.name) {
        case 'boolean':
            return 'boolean';
        case 'string':
            return 'text';
        case 'number':
            return 'number';
        case 'enum':
            return (Array.isArray(sbType.value) && sbType.value.length <= 5) ? 'radio' : 'select';
        case 'array':
            return 'object';
        case 'function':
        case 'symbol':
            return 'none';
        case 'other':
            return 'object';

        default:
            return sbType.name as ExpectedControl;
    }
}

export interface PropExpectation {
    prop: string;
    rcmName?: string;
    control?: ExpectedControl;
    required?: boolean;
    missing?: boolean;
    if?: SerializedPropIf;
    defaultValue?: { value: string };
    type?: SerializedPropType;
}

export interface ScenarioOptions {
    files: Record<string, string>;
    entryFile: string;
    exportName: string;
    expectations?: PropExpectation[];
    tempDirs: string[];
    maxPropCount?: number;
    absentProps?: string[];
    jsDocTags?: Record<string, string[]>;
}

function toSbType(serialized: SerializedPropType, required: boolean) {
    return convert({
        type: {
            name: serialized.name,
            raw: serialized.raw ?? serialized.name,
            ...(serialized.value !== undefined ? { value: serialized.value } : {}),
        },
        required,
        description: '',
        defaultValue: { value: '' },
    } satisfies DocgenInfo);
}

export function extractComponentDoc(options: {
    files: Record<string, string>;
    entryFile: string;
    exportName: string;
    tempDirs: string[];
}): SolidComponentDoc | undefined {
    const dir = createSpecTempDir(options.tempDirs);

    writeSpecFiles(dir, options.files);

    const commandLine: ts.ParsedCommandLine = {
        options: defaultCompilerOptions(),
        fileNames: Object.keys(options.files).map(relativePath => join(dir, relativePath)),
        errors: [],
    };

    const project = new SolidComponentMetaProject(ts, commandLine, undefined, new Map());
    const doc = project.extractFromComponentFile(join(dir, options.entryFile), options.exportName);

    project.dispose();

    return doc;
}

function evaluateExpectations(
    doc: SolidComponentDoc | undefined,
    expectations: PropExpectation[]
) {
    return expectations.map((expectation) => {
        const serialized = doc?.props[expectation.prop];

        return {
            ...expectation,
            actualRcmName: serialized?.type.name,
            actualRequired: serialized?.required,
            actualIf: serialized?.if,
            actualDefaultValue: serialized?.defaultValue,
            actualType: serialized?.type,
            actualControl: serialized
                ? inferControlType(toSbType(serialized.type, serialized.required))
                : 'MISSING' as const,
        };
    });
}

export function runScenario(options: ScenarioOptions) {
    const doc = extractComponentDoc(options);

    return {
        doc,
        results: evaluateExpectations(doc, options.expectations ?? []),
    };
}

export function expectScenario(
    label: string,
    options: Omit<ScenarioOptions, 'tempDirs'>,
    tempDirs: string[]
) {
    const { doc, results } = runScenario({ ...options, tempDirs });

    if (options.maxPropCount !== undefined) {
        expect(
            Object.keys(doc?.props ?? {}).length,
            `${ label } → prop count`
        ).toBeLessThan(options.maxPropCount);
    }

    for (const absentProp of options.absentProps ?? []) {
        expect(doc?.props[absentProp], `${ label } → ${ absentProp } absent`).toBeUndefined();
    }

    if (options.jsDocTags) {
        expect(doc?.jsDocTags, `${ label } → jsDocTags`).toEqual(options.jsDocTags);
    }

    for (const result of results) {
        const context = `${ label } → ${ result.prop }`;

        if (result.missing) {
            expect(result.actualControl, context).toBe('MISSING');

            continue;
        }

        if (result.rcmName !== undefined) {
            expect(result.actualRcmName, context).toBe(result.rcmName);
        }

        if (result.control !== undefined) {
            expect(result.actualControl, context).toBe(result.control);
        }

        if (result.required !== undefined) {
            expect(result.actualRequired, context).toBe(result.required);
        }

        if (result.if !== undefined) {
            expect(result.actualIf, context).toEqual(result.if);
        }

        if (result.defaultValue !== undefined) {
            expect(result.actualDefaultValue, context).toEqual(result.defaultValue);
        }

        if (result.type !== undefined) {
            expect(result.actualType, context).toEqual(result.type);
        }
    }

    return doc;
}

export function expectProp(
    doc: SolidComponentDoc | undefined,
    label: string,
    prop: string,
    expectation: Omit<PropExpectation, 'prop' | 'missing'>
) {
    const serialized = doc?.props[prop];
    const context = `${ label } → ${ prop }`;

    if (expectation.rcmName !== undefined) {
        expect(serialized?.type.name, context).toBe(expectation.rcmName);
    }

    if (expectation.type !== undefined) {
        expect(serialized?.type, context).toEqual(expectation.type);
    }

    if (expectation.if !== undefined) {
        expect(serialized?.if, context).toEqual(expectation.if);
    }

    if (expectation.defaultValue !== undefined) {
        expect(serialized?.defaultValue, context).toEqual(expectation.defaultValue);
    }

    if (expectation.required !== undefined) {
        expect(serialized?.required, context).toBe(expectation.required);
    }
}
