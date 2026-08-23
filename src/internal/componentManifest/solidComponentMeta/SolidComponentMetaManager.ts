import ts from '@typescript/typescript6';
import { watch } from 'node:fs';
import * as path from 'node:path';
import { getHeapStatistics } from 'node:v8';
import { logger } from 'storybook/internal/node-logger';

import { findTsConfigForFile } from './findTsConfigForFile';
import { SolidComponentMetaProject } from './SolidComponentMetaProject';

import type { SolidComponentDoc, StoryExtractionEntry } from '../types';

const DEFAULT_INFERRED_OPTIONS: ts.CompilerOptions = {
    strict: true,
    esModuleInterop: true,
    allowJs: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.Preserve,
};

/** Recycle shared TS programs once heap usage crosses this fraction of the V8 heap limit. */
const RECYCLE_HEAP_PRESSURE_RATIO = 0.7;

export class SolidComponentMetaManager {
    private readonly configProjects = new Map<string, SolidComponentMetaProject>();
    private readonly fsFileSnapshots = new Map<string, [number | undefined, ts.IScriptSnapshot | undefined]>();
    private inferredProject: SolidComponentMetaProject | undefined;
    private watching = false;
    private readonly watchersByDir = new Map<string, ReturnType<typeof watch>>();
    private readonly heapRecycleThresholdBytes: number;
    private hasWarnedHeapRecycle = false;

    /**
     * @param recycleHeapPressureRatio Fraction of the V8 heap limit at which programs are recycled.
     *   Pass `Infinity` in tests to disable; pass `0` to recycle after every extract.
     */
    constructor(
        private readonly typescript: typeof ts,
        recycleHeapPressureRatio = RECYCLE_HEAP_PRESSURE_RATIO
    ) {
        this.heapRecycleThresholdBytes = Math.floor(
            getHeapStatistics().heap_size_limit * recycleHeapPressureRatio
        );
    }

    dispose() {
        for (const watcher of this.watchersByDir.values()) {
            watcher.close();
        }

        this.watchersByDir.clear();
        this.disposeProjects();
        this.fsFileSnapshots.clear();
    }

    getProjectForFile(fileName: string) {
        const tsconfig = findTsConfigForFile(this.typescript, fileName);

        if (tsconfig) {
            return this.getOrCreateConfiguredProject(tsconfig) ?? this.getOrCreateInferredProject(fileName);
        }

        return this.getOrCreateInferredProject(fileName);
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

    extractFromComponentFile(componentPath: string, exportName: string): SolidComponentDoc | undefined {
        const doc = this.getProjectForFile(componentPath).extractFromComponentFile(
            path.resolve(componentPath),
            exportName
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

    startWatching() {
        if (this.watching) {
            return;
        }

        this.watching = true;

        const watchedDirs = new Set<string>();

        for (const project of [...this.configProjects.values(), this.inferredProject].filter(Boolean)) {
            for (const filePath of project!.getSourceFilePaths()) {
                watchedDirs.add(path.dirname(filePath));
            }
        }

        for (const dir of watchedDirs) {
            this.watchDirectory(dir);
        }
    }

    private watchDirectory(dir: string) {
        const normalized = path.normalize(dir);

        if (this.watchersByDir.has(normalized)) {
            return;
        }

        try {
            const watcher = watch(normalized, { recursive: true }, (_event, filename) => {
                if (!filename) {
                    return;
                }

                const filePath = path.join(normalized, filename.toString());
                const project = this.getProjectForFile(filePath);

                project.onFilesChanged([{ filePath, type: 'changed' }]);
            });

            this.watchersByDir.set(normalized, watcher);
        }
        catch(error) {
            logger.debug(`[solidComponentMeta] Failed to watch directory ${ normalized }: ${ String(error) }`);
        }
    }

    private getOrCreateConfiguredProject(tsconfigPath: string) {
        const existing = this.configProjects.get(tsconfigPath);

        if (existing) {
            return existing;
        }

        try {
            const config = this.typescript.readConfigFile(tsconfigPath, this.typescript.sys.readFile);

            if (config.error) {
                return undefined;
            }

            const commandLine = this.typescript.parseJsonConfigFileContent(
                config.config,
                this.typescript.sys,
                path.dirname(tsconfigPath),
                {},
                tsconfigPath
            );

            const project = new SolidComponentMetaProject(
                this.typescript,
                commandLine,
                tsconfigPath,
                this.fsFileSnapshots,
                () => {
                    const refreshed = this.typescript.readConfigFile(tsconfigPath, this.typescript.sys.readFile);

                    return this.typescript.parseJsonConfigFileContent(
                        refreshed.config,
                        this.typescript.sys,
                        path.dirname(tsconfigPath),
                        {},
                        tsconfigPath
                    );
                }
            );

            this.configProjects.set(tsconfigPath, project);

            return project;
        }
        catch(error) {
            logger.debug(`[solidComponentMeta] Failed to parse tsconfig ${ tsconfigPath }: ${ String(error) }`);

            return undefined;
        }
    }

    private getOrCreateInferredProject(fileName: string) {
        if (this.inferredProject) {
            return this.inferredProject;
        }

        const commandLine = this.typescript.parseJsonConfigFileContent(
            DEFAULT_INFERRED_OPTIONS,
            this.typescript.sys,
            path.dirname(path.resolve(fileName))
        );

        this.inferredProject = new SolidComponentMetaProject(
            this.typescript,
            commandLine,
            undefined,
            this.fsFileSnapshots
        );

        return this.inferredProject;
    }

    /**
     * Drop LanguageServices when heap usage approaches the V8 limit so the next extract rebuilds
     * instead of OOMing the docgen worker — same approach as React's ComponentMetaManager.
     */
    private recycleProjectsIfHeapPressured() {
        if (this.configProjects.size === 0 && !this.inferredProject) {
            return;
        }

        if (process.memoryUsage().heapUsed < this.heapRecycleThresholdBytes) {
            return;
        }

        if (!this.hasWarnedHeapRecycle) {
            this.hasWarnedHeapRecycle = true;
            const heapLimitMb = Math.round(getHeapStatistics().heap_size_limit / (1024 * 1024));

            logger.warn(
                `storybook-solidjs-vite recycled its TypeScript program after heap pressure (~${ heapLimitMb } MB) to avoid an out-of-memory crash. Docs/Controls may hitch briefly. If this repeats, raise Node's limit, e.g. NODE_OPTIONS="--max-old-space-size=${ heapLimitMb * 2 }"`
            );
        }

        this.disposeProjects();
        this.fsFileSnapshots.clear();
    }

    private disposeProjects() {
        for (const project of this.configProjects.values()) {
            project.dispose();
        }

        this.configProjects.clear();
        this.inferredProject?.dispose();
        this.inferredProject = undefined;
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
