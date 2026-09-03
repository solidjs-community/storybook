import ts from '@typescript/typescript6';
import { join } from 'node:path';

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
