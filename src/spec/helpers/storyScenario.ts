import ts from '@typescript/typescript6';
import { join } from 'node:path';
import { loadCsf } from 'storybook/internal/csf-tools';
import { expect } from 'vitest';

import { findMatchingComponent, getComponents } from '../../internal/componentManifest/getComponents';
import { SolidComponentMetaProject } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaProject';
import { createSpecTempDir, defaultCompilerOptions, writeSpecFiles } from './tempProject';

import type {
    ComponentRef,
    SerializedProp,
    SerializedPropType,
    SolidComponentDoc,
} from '../../internal/componentManifest/types';

function enumValues(type: SerializedPropType) {
    return (type.value ?? []).map(entry => entry.value).sort();
}

function expectSerializedTypesEqual(
    actual: SerializedPropType,
    expected: SerializedPropType,
    label: string
) {
    expect(actual.name, `${ label } → type.name`).toBe(expected.name);

    if (actual.name === 'enum' && expected.name === 'enum') {
        expect(enumValues(actual), `${ label } → enum values`).toEqual(enumValues(expected));

        return;
    }

    expect(actual, label).toEqual(expected);
}

function expectSerializedPropsEqual(actual: SerializedProp, expected: SerializedProp, label: string) {
    expect(actual.required, `${ label } → required`).toBe(expected.required);
    expectSerializedTypesEqual(actual.type, expected.type, `${ label } → type`);

    if (expected.defaultValue) {
        expect(actual.defaultValue, `${ label } → defaultValue`).toEqual(expected.defaultValue);
    }

    if (expected.if) {
        expect(actual.if, `${ label } → if`).toEqual(expected.if);
    }
}

export interface StoryPipelineResult {
    dir: string;
    storyPath: string;
    componentPath: string;
    componentRef: ComponentRef;
    doc: SolidComponentDoc | undefined;
    allComponents: ComponentRef[];
}

export async function extractViaStoryPipeline(options: {
    files: Record<string, string>;
    storyFile: string;
    componentFile: string;
    exportName: string;
    title?: string;
    componentName?: string;
    tempDirs: string[];
}): Promise<StoryPipelineResult> {
    const dir = createSpecTempDir(options.tempDirs);

    writeSpecFiles(dir, options.files);

    const storyPath = join(dir, options.storyFile);
    const componentPath = join(dir, options.componentFile);
    const storyContents = options.files[options.storyFile]!;
    const title = options.title ?? 'Example/Button';
    const csf = loadCsf(storyContents, { makeTitle: () => title }).parse();
    const allComponents = await getComponents({
        csf: csf as Parameters<typeof getComponents>[0]['csf'],
        storyFilePath: storyPath,
    });
    const componentRef = findMatchingComponent(
        allComponents,
        options.componentName ?? csf._meta?.component,
        title
    ) ?? allComponents.find(candidate => candidate.path === componentPath);

    if (!componentRef?.path) {
        return {
            dir,
            storyPath,
            componentPath,
            componentRef: componentRef ?? {
                componentName: options.exportName,
                importName: options.exportName,
                path: componentPath,
            },
            doc: undefined,
            allComponents,
        };
    }

    const fileNames = Object.keys(options.files).map(relativePath => join(dir, relativePath));
    const project = new SolidComponentMetaProject(
        ts,
        {
            options: defaultCompilerOptions(),
            fileNames,
            errors: [],
        },
        undefined,
        new Map()
    );

    project.extractPropsFromStories([{ storyPath, component: componentRef }]);

    const doc = componentRef.reactComponentMeta;

    project.dispose();

    return {
        dir,
        storyPath,
        componentPath,
        componentRef,
        doc,
        allComponents,
    };
}

export function extractViaComponentFile(options: {
    dir: string;
    componentPath: string;
    exportName: string;
    fileNames: string[];
}): SolidComponentDoc | undefined {
    const project = new SolidComponentMetaProject(
        ts,
        {
            options: defaultCompilerOptions(),
            fileNames: options.fileNames,
            errors: [],
        },
        undefined,
        new Map()
    );

    const doc = project.extractFromComponentFile(options.componentPath, options.exportName);

    project.dispose();

    return doc;
}

export function expectStoryDocMatchesComponentDoc(
    label: string,
    storyDoc: SolidComponentDoc | undefined,
    componentDoc: SolidComponentDoc | undefined
) {
    expect(storyDoc, `${ label } — story pipeline doc`).toBeDefined();
    expect(componentDoc, `${ label } — direct component doc`).toBeDefined();

    expect(
        Object.keys(storyDoc!.props).sort(),
        `${ label } — prop keys`
    ).toEqual(Object.keys(componentDoc!.props).sort());

    for (const propName of Object.keys(componentDoc!.props)) {
        expectSerializedPropsEqual(
            storyDoc!.props[propName]!,
            componentDoc!.props[propName]!,
            `${ label } → ${ propName }`
        );
    }
}

export async function expectStoryMatchesDirectExtract(options: {
    label: string;
    files: Record<string, string>;
    storyFile: string;
    componentFile: string;
    exportName: string;
    title?: string;
    tempDirs: string[];
}) {
    const pipeline = await extractViaStoryPipeline(options);
    const fileNames = Object.keys(options.files).map(relativePath => join(pipeline.dir, relativePath));
    const directDoc = extractViaComponentFile({
        dir: pipeline.dir,
        componentPath: pipeline.componentPath,
        exportName: options.exportName,
        fileNames,
    });

    expectStoryDocMatchesComponentDoc(options.label, pipeline.doc, directDoc);

    return { pipeline, directDoc };
}
