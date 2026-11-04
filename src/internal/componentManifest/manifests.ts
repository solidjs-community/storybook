import ts from '@typescript/typescript6';
import { isAbsolute, join } from 'node:path';
import { getProjectRoot } from 'storybook/internal/common';

import { MANIFEST_DOCGEN_ENGINE, SolidComponentMetaManager } from './solidComponentMeta/SolidComponentMetaManager';

interface ManifestEntry {
    id: string;
    title: string;
    name: string;
    importPath: string;
    type: string;
    subtype?: string;
    tags?: string[];
    storiesImports?: string[];
}

export async function generateComponentManifests(
    existingManifests: Record<string, unknown> = {},
    _options: {
        manifestEntries: ManifestEntry[];
        watch?: boolean;
        presets?: {
            apply: (key: string, initial?: unknown) => Promise<unknown>;
        };
    }
) {
    return {
        ...existingManifests,
        components: {
            v: 0,
            components: {},
            meta: {
                docgen: MANIFEST_DOCGEN_ENGINE,
                durationMs: 0,
            },
        },
    };
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
        const manager = new SolidComponentMetaManager(ts);
        // addon-vitest passes Vite's absolute module id; other callers pass project-relative paths.
        const resolvedPath = isAbsolute(componentFilePath)
            ? componentFilePath
            : join(getProjectRoot(), componentFilePath);
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
