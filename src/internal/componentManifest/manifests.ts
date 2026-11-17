import { isAbsolute, join } from 'node:path';
import { getProjectRoot } from 'storybook/internal/common';

import { DOCGEN_ENGINE, getSharedSolidComponentMetaManager } from './solidComponentMeta/SolidComponentMetaManager';

import type { ComponentsManifest, StorybookConfigRaw } from 'storybook/internal/types';

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
    options: {
        manifestEntries: ManifestEntry[];
        watch?: boolean;
        presets?: {
            apply: (key: string, initial?: unknown) => Promise<unknown>;
        };
    }
) {
    const features = await options.presets?.apply('features', {}) as StorybookConfigRaw['features'];

    // Like Vue, Svelte and Web Components: with docgen off there is no engine to report.
    if (!features?.docgenServer) {
        return existingManifests;
    }

    return {
        ...existingManifests,
        components: {
            v: 0,
            components: {},
            meta: {
                // Core's union does not list Solid yet; nothing in core switches on the id.
                docgen: DOCGEN_ENGINE as unknown as NonNullable<ComponentsManifest['meta']>['docgen'],
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
        const manager = getSharedSolidComponentMetaManager();
        // addon-vitest passes Vite's absolute module id; other callers pass project-relative paths.
        const resolvedPath = isAbsolute(componentFilePath)
            ? componentFilePath
            : join(getProjectRoot(), componentFilePath);
        const doc = manager.extractFromComponentFile(
            resolvedPath,
            componentExportName ?? 'default'
        );

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
