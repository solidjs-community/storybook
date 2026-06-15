import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recast } from 'storybook/internal/babel';
import { Tag } from 'storybook/internal/core-server';
import { storyNameFromExport } from 'storybook/internal/csf';
import { extractDescription, loadCsf } from 'storybook/internal/csf-tools';

import { getCodeSnippet } from '../codeExamples/generateCodeSnippet';
import { invariant } from '../codeExamples/invariant';
import { findMatchingComponent, getComponents } from './getComponents';
import { DOCGEN_ENGINE, getOrCreateSolidComponentMetaManager, MANIFEST_DOCGEN_ENGINE } from './solidComponentMeta/SolidComponentMetaManager';

import type { SolidComponentDoc } from './types';

type ManifestEntry = {
    id: string;
    title: string;
    name: string;
    importPath: string;
    type: string;
    subtype?: string;
    tags?: string[];
    storiesImports?: string[];
};

function isAttachedDocsEntry(entry: ManifestEntry) {
    return entry.type === 'docs'
      && entry.tags?.includes(Tag.ATTACHED_MDX) === true
      && (entry.storiesImports?.length ?? 0) > 0;
}

function selectComponentEntries(manifestEntries: ManifestEntry[]) {
    const entriesByComponentId = new Map<string, ManifestEntry>();

    for (const entry of manifestEntries) {
        if (
            !(entry.type === 'story' && entry.subtype === 'story')
            && !isAttachedDocsEntry(entry)
        ) {
            continue;
        }

        const componentId = entry.id.split('--')[0] ?? entry.id;
        const existingEntry = entriesByComponentId.get(componentId);

        if (!existingEntry) {
            entriesByComponentId.set(componentId, entry);

            continue;
        }

        if (existingEntry.type === 'docs' && entry.type === 'story') {
            entriesByComponentId.set(componentId, entry);
        }
    }

    return [...entriesByComponentId.values()];
}

function extractStories(
    csf: ReturnType<ReturnType<typeof loadCsf>['parse']>,
    componentName: string | undefined,
    manifestEntries: ManifestEntry[]
) {
    const manifestEntryIds = new Set(manifestEntries.map(entry => entry.id));

    return Object.entries(csf._stories)
        .filter(([, story]) => manifestEntryIds.has(story.id))
        .map(([storyExport, story]) => {
            try {
                const description = extractDescription(csf._storyStatements[storyExport])?.trim();

                return {
                    id: story.id,
                    name: story.name ?? storyNameFromExport(storyExport),
                    snippet: recast.print(getCodeSnippet(csf, storyExport, componentName)).code,
                    description,
                };
            }
            catch(e) {
                invariant(e instanceof Error);

                return {
                    id: story.id,
                    name: story.name ?? storyNameFromExport(storyExport),
                    error: { name: e.name, message: e.message },
                };
            }
        });
}

function normalizeComponentMeta(doc: SolidComponentDoc | undefined) {
    if (!doc) {
        return undefined;
    }

    return {
        ...doc,
        filePath: doc.filePath,
        exportName: doc.exportName,
    };
}

export async function generateComponentManifests(
    existingManifests: Record<string, unknown> = {},
    options: {
        manifestEntries: ManifestEntry[];
        watch?: boolean;
    }
) {
    const { manifestEntries, watch: watchMode = false } = options;
    const startTime = performance.now();
    const manager = await getOrCreateSolidComponentMetaManager(watchMode);

    try {
        const entriesByUniqueComponent = selectComponentEntries(manifestEntries);
        const resolvedEntries = await Promise.all(
            entriesByUniqueComponent.map(async(entry) => {
                const storyFilePath = entry.type === 'story'
                    ? entry.importPath
                    : entry.storiesImports?.[0];

                if (!storyFilePath) {
                    throw new Error(`Manifest entry ${ entry.id } has no story import path`);
                }

                const storyPath = join(process.cwd(), storyFilePath);
                const storyFile = readFileSync(storyPath, 'utf8');
                const csf = loadCsf(storyFile, { makeTitle: () => entry.title }).parse();
                const componentName = csf._meta?.component;
                const allComponents = await getComponents({ csf: csf as Parameters<typeof getComponents>[0]['csf'], storyFilePath: storyPath });
                const component = findMatchingComponent(allComponents, componentName, entry.title);

                return {
                    storyPath,
                    component,
                    entry,
                    storyFilePath,
                    csf,
                    componentName,
                    allComponents,
                };
            })
        );

        if (manager) {
            manager.batchExtract(
                resolvedEntries.flatMap(({ storyPath, component }) => (
                    component ? [{ storyPath, component }] : []
                ))
            );
        }

        const components = resolvedEntries.map(({
            component,
            entry,
            storyFilePath,
            csf,
            componentName,
        }) => {
            const id = entry.id.split('--')[0] ?? entry.id;
            const title = entry.title.split('/').at(-1)?.replace(/\s+/g, '') ?? id;
            const reactComponentMeta = normalizeComponentMeta(component?.reactComponentMeta);
            const stories = extractStories(csf, componentName, manifestEntries);
            const base = {
                id,
                name: componentName ?? title,
                path: storyFilePath,
                stories,
                import: component?.importId
                    ? `import { ${ component.importName } } from "${ component.importId }";`
                    : '',
                jsDocTags: component?.componentJsDocTags ?? {},
            };

            if (!reactComponentMeta) {
                return {
                    ...base,
                    error: {
                        name: 'No component import found',
                        message: componentName
                            ? `No component file found for the "${ componentName }" component.`
                            : 'We could not detect the component from your story file. Specify meta.component.',
                    },
                };
            }

            return {
                ...base,
                description: reactComponentMeta.description,
                reactComponentMeta,
            };
        });

        if (manager && watchMode) {
            manager.startWatching();
        }

        const durationMs = Math.round(performance.now() - startTime);

        return {
            ...existingManifests,
            components: {
                v: 0,
                components: Object.fromEntries(components.map(component => [component.id, component])),
                meta: {
                    docgen: MANIFEST_DOCGEN_ENGINE,
                    durationMs,
                    engine: DOCGEN_ENGINE,
                },
            },
        };
    }
    finally {
        if (manager && !watchMode) {
            manager.dispose();
        }
    }
}

export async function getArgTypesData(
    _input: unknown,
    options?: {
        componentFilePath?: string;
        componentExportName?: string;
    }
) {
    const { componentFilePath, componentExportName } = options ?? {};

    if (!componentFilePath) {
        return null;
    }

    try {
        const ts = await import('typescript');
        const { SolidComponentMetaManager } = await import('./solidComponentMeta/SolidComponentMetaManager');
        const manager = new SolidComponentMetaManager(ts);
        const resolvedPath = join(process.cwd(), componentFilePath);
        const doc = manager.extractFromComponentFile(
            resolvedPath,
            componentExportName ?? 'default'
        );

        manager.dispose();

        if (!doc) {
            return null;
        }

        const { solidComponentDocToArgTypesData } = await import('./toDocgenInfo');

        return solidComponentDocToArgTypesData(doc);
    }
    catch {
        return null;
    }
}
