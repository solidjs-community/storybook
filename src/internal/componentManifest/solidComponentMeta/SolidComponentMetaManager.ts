import ts from '@typescript/typescript6';
import * as path from 'node:path';
import {
    ComponentMetaManager,
    type ComponentMetaProjectFactory,
    type FileSnapshotCache,
} from 'storybook/internal/component-meta';
import { logger } from 'storybook/internal/node-logger';

import { findTsConfigForFile, parseTsConfig } from './findTsConfigForFile';
import { SolidComponentMetaProject } from './SolidComponentMetaProject';

import type { SolidComponentDoc, StoryExtractionEntry } from '../types';

const DEFAULT_INFERRED_OPTIONS: ts.CompilerOptions = {
    strict: true,
    esModuleInterop: true,
    allowJs: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.Preserve,
};

/**
 * Builds Solid projects for core's manager. Every project shares one mtime-cached snapshot map,
 * which is dropped on heap-pressure recycle and on dispose.
 */
function createSolidProjectFactory(
    typescript: typeof ts
): ComponentMetaProjectFactory<SolidComponentMetaProject, ts.ParsedCommandLine> {
    const fsFileSnapshots: FileSnapshotCache<ts.IScriptSnapshot> = new Map();

    return {
        parseCommandLine: (tsconfig) => {
            const commandLine = parseTsConfig(typescript, tsconfig);

            if (!commandLine) {
                throw new Error(`Cannot read ${ tsconfig }`);
            }

            return commandLine;
        },
        createConfiguredProject: (commandLine, tsconfig, getCommandLine) => new SolidComponentMetaProject(
            typescript,
            commandLine,
            tsconfig,
            fsFileSnapshots,
            getCommandLine
        ),
        createInferredProject: () => new SolidComponentMetaProject(
            typescript,
            { options: { ...DEFAULT_INFERRED_OPTIONS }, fileNames: [], errors: [] },
            undefined,
            fsFileSnapshots
        ),
        recycle: () => fsFileSnapshots.clear(),
        dispose: () => fsFileSnapshots.clear(),
    };
}

/** The base's project cache, which Solid's tsconfig lookup fills instead of the base's own lookup. */
interface ConfiguredProjectCache {
    getOrCreateConfiguredProject?(tsconfig: string): SolidComponentMetaProject | null;
}

/**
 * Solid specialization of core's `ComponentMetaManager`, which owns the project cache, file
 * watching and heap-pressure recycling. Only the tsconfig lookup stays ours: the closest tsconfig
 * that includes the file, directly or through project references, else the closest one. Core's
 * lookup falls back to an inferred project instead, which drops the user's `paths` and JSX options.
 */
export class SolidComponentMetaManager extends ComponentMetaManager<SolidComponentMetaProject, ts.ParsedCommandLine> {
    /**
     * @param recycleHeapPressureRatio Fraction of the V8 heap limit at which programs are recycled.
     *   Pass `Infinity` in tests to disable; pass `0` to recycle after every extract.
     */
    private readonly ts: typeof ts;

    constructor(typescript: typeof ts, recycleHeapPressureRatio?: number) {
        super(typescript, createSolidProjectFactory(typescript), recycleHeapPressureRatio);
        this.ts = typescript;
    }

    override getProjectForFile(fileName: string): SolidComponentMetaProject {
        const tsconfig = findTsConfigForFile(this.ts, fileName);
        const project = tsconfig
            ? (this as unknown as ConfiguredProjectCache).getOrCreateConfiguredProject?.(tsconfig)
            : undefined;

        return project ?? super.getProjectForFile(fileName);
    }

    batchExtract(entries: StoryExtractionEntry[]) {
        const extractable = entries.filter(
            entry => entry.component.path && entry.component.importName
        );

        const byProject = new Map<SolidComponentMetaProject, StoryExtractionEntry[]>();

        for (const entry of extractable) {
            const project = this.getProjectForFile(entry.storyPath);
            const bucket = byProject.get(project) ?? [];

            bucket.push(entry);
            byProject.set(project, bucket);
        }

        for (const [project, projectEntries] of byProject) {
            try {
                project.extractPropsFromStories(projectEntries);
            }
            catch(error) {
                logger.debug(`[solidComponentMeta] Batch extraction failed: ${ String(error) }`);
            }
        }

        this.recycleProjectsIfHeapPressured();
    }

    extractFromComponentFile(
        componentPath: string,
        exportName: string,
        referencedArgNames?: ReadonlySet<string>
    ): SolidComponentDoc | undefined {
        const doc = this.getProjectForFile(componentPath).extractFromComponentFile(
            path.resolve(componentPath),
            exportName,
            referencedArgNames
        );

        this.recycleProjectsIfHeapPressured();

        return doc;
    }

    extractAllExportsFromFile(componentPath: string): SolidComponentDoc[] {
        const docs = this.getProjectForFile(componentPath).extractAllExportsFromFile(
            path.resolve(componentPath)
        );

        this.recycleProjectsIfHeapPressured();

        return docs;
    }
}

let watchManager: SolidComponentMetaManager | undefined;

export async function getOrCreateSolidComponentMetaManager(
    watchMode = false
): Promise<SolidComponentMetaManager | undefined> {
    if (watchMode && watchManager) {
        return watchManager;
    }

    // Always use the JS Compiler API from @typescript/typescript6 — independent of the
    // consumer's `typescript` peer (which may be TypeScript 7 without a programmatic API).
    const instance = new SolidComponentMetaManager(ts);

    if (watchMode) {
        watchManager = instance;
    }

    return instance;
}

export const DOCGEN_ENGINE = 'solid-component-meta' as const;

/** Storybook core manifest UI expects `react-component-meta` as the engine id. */
export const MANIFEST_DOCGEN_ENGINE = 'react-component-meta' as const;
