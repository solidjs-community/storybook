import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getStoryImportPathFromEntry, STORY_FILE_TEST_REGEXP } from 'storybook/internal/common';
import { storyNameFromExport } from 'storybook/internal/csf';
import {
    buildImportStatements,
    createStoryArgsResolver,
    createStoryReferenceResolver,
    extractStoryJSDocInfo,
    loadCsf,
    unresolvedWarning,
} from 'storybook/internal/csf-tools';

import { getCodeSnippet } from '../../codeExamples/generateCodeSnippet';
import { findMatchingComponent, getComponents, getImportablePackageName } from '../getComponents';
import { extractDeclaredSubcomponents } from '../subcomponents';

import type { CsfFile, ImportRef } from 'storybook/internal/csf-tools';
import type { StoryDoc, StoryDocsPayload, StoryDocsProviderInput, StoryDocsProviderPreset } from 'storybook/internal/types';

// One instance per process, so the module-resolution cache is shared; each build opens its own.
const openStoryReferences = createStoryReferenceResolver();

function readEntry(entry: StoryDocsProviderInput['entry']) {
    const importPath = getStoryImportPathFromEntry(entry);
    const title = entry.title || 'Component';
    const id = entry.id.split('--')[0] || entry.id || title.replace(/\s+/g, '');

    return { importPath, title, id };
}

function getFallbackImport(packageName: string | undefined, componentName: string | undefined) {
    const exportName = componentName?.split('.').at(-1);

    return packageName && exportName
        ? buildImportStatements({
            refs: [{ importId: packageName, importName: exportName, localImportName: exportName }],
        }).join('\n')
        : '';
}

/**
 * Each story's description and summary, plus the fields `snippetOf` adds. A story whose docs throw
 * carries the error instead.
 */
function readStories(csf: CsfFile, snippetOf?: (storyExport: string) => Partial<StoryDoc>) {
    return Object.fromEntries(
        Object.entries(csf._stories).map(([storyExport, story]): [string, StoryDoc] => {
            const name = story.name ?? storyNameFromExport(storyExport);

            try {
                const { description, summary } = extractStoryJSDocInfo(csf._storyStatements[storyExport], csf.editor);

                return [story.id, {
                    id: story.id,
                    name,
                    ...(description ? { description } : {}),
                    ...(summary ? { summary } : {}),
                    ...snippetOf?.(storyExport),
                }];
            }
            catch(error) {
                const err = error instanceof Error ? error : new Error(String(error));

                return [story.id, { id: story.id, name, error: { name: err.name, message: err.message } }];
            }
        })
    );
}

/**
 * Story docs for one CSF file: each story's snippet, description and summary, and the import block
 * core prepends to every snippet. Without `codeExamples` the stories carry no snippets and the
 * payload no imports.
 */
async function buildStoryDocs(
    importPath: string,
    title: string,
    id: string,
    codeExamples: boolean
): Promise<StoryDocsPayload> {
    const storyPath = join(process.cwd(), importPath);
    const storyFile = readFileSync(storyPath, 'utf8');
    const csf = loadCsf(storyFile, { makeTitle: () => title, fileName: storyPath }).parse();
    const componentName = csf._meta?.component;
    const base = { id, name: componentName ?? title, path: importPath };

    if (!codeExamples) {
        return { ...base, stories: readStories(csf) };
    }

    const allComponents = await getComponents({
        csf,
        storyFilePath: storyPath,
        additionalComponentNames: extractDeclaredSubcomponents(csf).map(subcomponent => subcomponent.componentName),
    });
    const component = findMatchingComponent(allComponents, componentName, title);
    const resolver = createStoryArgsResolver(csf, { filePath: storyPath, ...openStoryReferences() });
    const argImports: ImportRef[] = [];
    const stories = readStories(csf, storyExport => {
        const snippet = getCodeSnippet(csf, storyExport, component?.componentName ?? componentName, resolver);
        const warning = unresolvedWarning(snippet.unresolved);

        argImports.push(...snippet.imports);

        return { snippet: snippet.code, ...(warning ? { warning } : {}) };
    });
    const packageName = getImportablePackageName(component?.path, storyPath);
    // An arg value that kept the name another module gave it only compiles once the import block
    // names that module too. `packageName` rewriting is for the component, so those refs opt out of it.
    const argRefs = argImports.map(ref => ({ ...ref, isPackage: true }));
    const imports = buildImportStatements({ refs: [...allComponents, ...argRefs], ...(packageName ? { packageName } : {}) })
        .join('\n')
        .trim() || getFallbackImport(packageName, componentName);

    return { ...base, ...(imports ? { import: imports } : {}), stories };
}

export const experimental_storyDocsProvider: StoryDocsProviderPreset = async(next, options) => {
    // `features.experimentalCodeExamples: false` turns snippets off; descriptions are still served.
    const features = await options.presets?.apply('features');
    const codeExamples = features?.experimentalCodeExamples !== false;

    return async(input) => {
        const { importPath, title, id } = readEntry(input.entry);

        if (!importPath || !STORY_FILE_TEST_REGEXP.test(importPath)) {
            return next(input);
        }

        let ours: StoryDocsPayload | undefined;

        try {
            ours = await buildStoryDocs(importPath, title, id, codeExamples);
        }
        catch {
            ours = undefined;
        }

        const downstream = await next(input);

        if (!ours) {
            return downstream;
        }

        if (!downstream) {
            return ours;
        }

        return { ...downstream, ...ours };
    };
};
