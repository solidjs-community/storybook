import { watch } from 'node:fs';
import * as path from 'node:path';
import { logger } from 'storybook/internal/node-logger';
import ts from 'typescript';

import { SolidComponentMetaProject } from './SolidComponentMetaProject';

import type { SolidComponentDoc, StoryExtractionEntry } from '../types';

const ROOT_TS_CONFIG_NAMES = ['tsconfig.json', 'jsconfig.json'];
const DEFAULT_INFERRED_OPTIONS: ts.CompilerOptions = {
    strict: true,
    esModuleInterop: true,
    allowJs: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.Preserve,
};

export class SolidComponentMetaManager {
    private readonly configProjects = new Map<string, SolidComponentMetaProject>();
    private readonly fsFileSnapshots = new Map<string, [number | undefined, ts.IScriptSnapshot | undefined]>();
    private inferredProject: SolidComponentMetaProject | undefined;
    private watching = false;
    private readonly watchersByDir = new Map<string, ReturnType<typeof watch>>();

    constructor(private readonly typescript: typeof ts) {}

    dispose() {
        for (const watcher of this.watchersByDir.values()) {
            watcher.close();
        }

        this.watchersByDir.clear();

        for (const project of this.configProjects.values()) {
            project.dispose();
        }

        this.configProjects.clear();
        this.inferredProject?.dispose();
        this.inferredProject = undefined;
    }

    getProjectForFile(fileName: string) {
        const tsconfig = this.findNearestTsConfig(fileName);

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
    }

    extractFromComponentFile(componentPath: string, exportName: string): SolidComponentDoc | undefined {
        return this.getProjectForFile(componentPath).extractFromComponentFile(
            path.resolve(componentPath),
            exportName
        );
    }

    extractAllExportsFromFile(componentPath: string): SolidComponentDoc[] {
        return this.getProjectForFile(componentPath).extractAllExportsFromFile(
            path.resolve(componentPath)
        );
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

    private findNearestTsConfig(filePath: string) {
        let dir = path.dirname(path.resolve(filePath));

        while (true) {
            for (const name of ROOT_TS_CONFIG_NAMES) {
                const candidate = path.join(dir, name);

                if (this.typescript.sys.fileExists(candidate)) {
                    return candidate.replace(/\\/g, '/');
                }
            }

            const parent = path.dirname(dir);

            if (parent === dir) {
                return null;
            }

            dir = parent;
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
}

let watchManager: SolidComponentMetaManager | undefined;

export async function getOrCreateSolidComponentMetaManager(
    watchMode = false
): Promise<SolidComponentMetaManager | undefined> {
    if (watchMode && watchManager) {
        return watchManager;
    }

    try {
        const ts = await import('typescript');
        const instance = new SolidComponentMetaManager(ts);

        if (watchMode) {
            watchManager = instance;
        }

        return instance;
    }
    catch {
        return undefined;
    }
}

export const DOCGEN_ENGINE = 'solid-component-meta' as const;

/** Storybook core manifest UI expects `react-component-meta` as the engine id. */
export const MANIFEST_DOCGEN_ENGINE = 'react-component-meta' as const;
