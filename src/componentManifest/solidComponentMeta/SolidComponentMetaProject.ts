import { createLanguage, FileMap, type SourceScript } from '@volar/language-core';
import { createLanguageServiceHost, resolveFileLanguageId } from '@volar/typescript';
import * as path from 'node:path';

import {
    resolveFromComponentFile,
    resolveFromMetaComponent,
    resolvePropsFromStoryFile,
    serializeComponentDoc
} from './resolveProps';

import type ts from 'typescript';
import type { ComponentRef, SolidComponentDoc, StoryExtractionEntry } from '../types';

function arrayItemsEqual(a: string[], b: string[]) {
    if (a.length !== b.length) {
        return false;
    }

    const set = new Set(a);

    for (const file of b) {
        if (!set.has(file)) {
            return false;
        }
    }

    return true;
}

export class SolidComponentMetaProject {
    private readonly ls: ts.LanguageService;
    private projectVersion = 0;
    private shouldCheckRootFiles = false;
    private entries: StoryExtractionEntry[] = [];
    private warmupTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly typescript: typeof ts,
        private commandLine: ts.ParsedCommandLine,
        private readonly configFileName: string | undefined,
        private readonly fsFileSnapshots: Map<string, [number | undefined, ts.IScriptSnapshot | undefined]>,
        private readonly getCommandLineFn?: () => ts.ParsedCommandLine
    ) {
        const language = createLanguage(
            [{ getLanguageId: fileName => resolveFileLanguageId(fileName) }],
            new FileMap(typescript.sys.useCaseSensitiveFileNames) as Map<string, SourceScript<string>>,
            (fileName, includeFsFiles) => {
                if (!includeFsFiles) {
                    return;
                }

                const cache = fsFileSnapshots.get(fileName);
                const modifiedTime = typescript.sys.getModifiedTime?.(fileName)?.valueOf();
                let snapshot: ts.IScriptSnapshot | undefined;

                if (!cache || cache[0] !== modifiedTime) {
                    if (typescript.sys.fileExists(fileName)) {
                        const text = typescript.sys.readFile(fileName);

                        snapshot = text !== undefined ? typescript.ScriptSnapshot.fromString(text) : undefined;
                    }
                    else {
                        snapshot = undefined;
                    }

                    fsFileSnapshots.set(fileName, [modifiedTime, snapshot]);
                }
                else {
                    snapshot = cache[1];
                }

                if (snapshot) {
                    language.scripts.set(fileName, snapshot);
                }
                else {
                    language.scripts.delete(fileName);
                }
            }
        );

        const projectHost = {
            getCurrentDirectory: () => (
                this.configFileName
                    ? path.dirname(this.configFileName)
                    : commandLine.options.rootDir ?? process.cwd()
            ),
            getCompilationSettings: () => this.commandLine.options,
            getProjectReferences: () => this.commandLine.projectReferences,
            getProjectVersion: () => {
                this.checkRootFilesUpdate();

                return this.projectVersion.toString();
            },
            getScriptFileNames: () => {
                this.checkRootFilesUpdate();

                return this.commandLine.fileNames;
            },
        };

        const { languageServiceHost } = createLanguageServiceHost(
            typescript,
            typescript.sys,
            language,
            s => s,
            projectHost
        );

        this.ls = typescript.createLanguageService(languageServiceHost);
    }

    dispose() {
        clearTimeout(this.warmupTimer);
        this.ls.dispose();
    }

    ensureFiles(fileNames: string[]) {
        let added = false;

        for (const fileName of fileNames) {
            if (!this.commandLine.fileNames.includes(fileName)) {
                this.commandLine.fileNames.push(fileName);
                added = true;
            }
        }

        if (added) {
            this.projectVersion++;
        }
    }

    checkRootFilesUpdate() {
        if (!this.shouldCheckRootFiles || !this.getCommandLineFn) {
            return;
        }

        this.shouldCheckRootFiles = false;

        const newCommandLine = this.getCommandLineFn();

        if (!arrayItemsEqual(newCommandLine.fileNames, this.commandLine.fileNames)) {
            this.commandLine.fileNames = newCommandLine.fileNames;
            this.projectVersion++;
        }
    }

    ensureFresh(fileNames: string[]) {
        let stale = false;

        for (const fileName of fileNames) {
            const cache = this.fsFileSnapshots.get(fileName);

            if (!cache) {
                continue;
            }

            const currentMtime = this.typescript.sys.getModifiedTime?.(fileName)?.valueOf();

            if (cache[0] !== currentMtime) {
                this.fsFileSnapshots.delete(fileName);
                stale = true;
            }
        }

        if (stale) {
            this.projectVersion++;
        }
    }

    onFilesChanged(changes: Array<{ filePath: string; type: 'changed' | 'created' | 'deleted' }>) {
        for (const { filePath } of changes) {
            this.fsFileSnapshots.delete(filePath);
        }

        const oldVersion = this.projectVersion;
        const program = this.ls.getProgram();

        for (const { filePath, type } of changes) {
            if (type === 'changed') {
                if (program?.getSourceFile(filePath)) {
                    this.projectVersion++;
                }
            }
            else if (type === 'deleted') {
                if (program?.getSourceFile(filePath)) {
                    this.projectVersion++;
                }

                this.shouldCheckRootFiles = true;
                break;
            }
            else if (type === 'created') {
                this.shouldCheckRootFiles = true;
                break;
            }
        }

        if (this.projectVersion !== oldVersion && this.entries.length > 0) {
            clearTimeout(this.warmupTimer);
            this.warmupTimer = setTimeout(() => {
                try {
                    this.extractPropsFromStories(this.entries);
                }
                catch {
                    // ignore warmup failures
                }
            }, 100);
            this.warmupTimer?.unref?.();
        }
    }

    extractPropsFromStories(entries: StoryExtractionEntry[]) {
        this.entries = entries;

        const allFiles = entries.flatMap(
            entry => entry.component.path
                ? [entry.storyPath, entry.component.path]
                : [entry.storyPath]
        );

        this.ensureFiles(allFiles);
        this.ensureFresh(allFiles);

        const program = this.ls.getProgram();

        if (!program) {
            return;
        }

        const checker = program.getTypeChecker();
        const serializationContextByComponentPath = new Map<string, {
            sourceFile: ts.SourceFile;
        }>();

        for (const entry of entries) {
            try {
                const storySourceFile = program.getSourceFile(entry.storyPath);
                const entryComponent = entry.component;
                const componentPath = entryComponent.path;
                const exportName = entryComponent.importName;

                if (!storySourceFile || !componentPath || !exportName) {
                    continue;
                }

                const importId = entryComponent.importId;
                const isPackageImport = importId && !importId.startsWith('.');
                let componentSourceFile: ts.SourceFile | undefined;

                if (isPackageImport && importId) {
                    const resolved = this.typescript.resolveModuleName(
                        importId,
                        entry.storyPath,
                        this.commandLine.options,
                        this.typescript.sys
                    );

                    componentSourceFile = resolved.resolvedModule
                        ? program.getSourceFile(resolved.resolvedModule.resolvedFileName)
                        : program.getSourceFile(componentPath);
                }
                else {
                    componentSourceFile = program.getSourceFile(componentPath);
                }

                if (!componentSourceFile) {
                    continue;
                }

                let resolvedComponent = importId
                    ? resolvePropsFromStoryFile(
                        this.typescript,
                        checker,
                        storySourceFile,
                        entryComponent
                    )
                    : undefined;

                resolvedComponent ??= resolveFromMetaComponent(
                    this.typescript,
                    checker,
                    storySourceFile,
                    entryComponent
                );

                resolvedComponent ??= resolveFromComponentFile(
                    this.typescript,
                    checker,
                    componentSourceFile,
                    exportName,
                    entryComponent
                );

                if (!resolvedComponent) {
                    continue;
                }

                let serializationContext = serializationContextByComponentPath.get(componentPath);

                if (!serializationContext) {
                    serializationContext = { sourceFile: componentSourceFile };
                    serializationContextByComponentPath.set(componentPath, serializationContext);
                }

                const doc = serializeComponentDoc(this.typescript, checker, {
                    sourceFile: serializationContext.sourceFile,
                    resolvedComponent,
                });

                if (doc) {
                    entryComponent.reactComponentMeta = doc;

                    if (doc.jsDocTags) {
                        entryComponent.componentJsDocTags = doc.jsDocTags;

                        const importOverride = doc.jsDocTags['import']?.[0]?.trim();

                        if (importOverride) {
                            entryComponent.importOverride = importOverride;
                        }
                    }
                }
            }
            catch {
                continue;
            }
        }
    }

    extractFromComponentFile(componentPath: string, exportName: string): SolidComponentDoc | undefined {
        this.ensureFiles([componentPath]);
        this.ensureFresh([componentPath]);

        const program = this.ls.getProgram();

        if (!program) {
            return undefined;
        }

        const checker = program.getTypeChecker();
        const sourceFile = program.getSourceFile(componentPath);

        if (!sourceFile) {
            return undefined;
        }

        const componentRef: ComponentRef = {
            componentName: exportName,
            importName: exportName,
            path: componentPath,
        };

        const resolved = resolveFromComponentFile(
            this.typescript,
            checker,
            sourceFile,
            exportName,
            componentRef
        );

        if (!resolved) {
            return undefined;
        }

        return serializeComponentDoc(this.typescript, checker, {
            sourceFile,
            resolvedComponent: resolved,
        });
    }

    extractAllExportsFromFile(componentPath: string): SolidComponentDoc[] {
        this.ensureFiles([componentPath]);
        this.ensureFresh([componentPath]);

        const program = this.ls.getProgram();

        if (!program) {
            return [];
        }

        const checker = program.getTypeChecker();
        const sourceFile = program.getSourceFile(componentPath);

        if (!sourceFile) {
            return [];
        }

        const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

        if (!moduleSymbol) {
            return [];
        }

        const docs: SolidComponentDoc[] = [];

        for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
            const name = exportSymbol.getName();

            if (name === 'default' || /^[A-Z]/.test(name)) {
                const doc = this.extractFromComponentFile(componentPath, name);

                if (doc && Object.keys(doc.props).length > 0) {
                    docs.push(doc);
                }
            }
        }

        return docs;
    }

    getSourceFilePaths() {
        const program = this.ls.getProgram();

        return program
            ? program.getSourceFiles()
                .map(sf => sf.fileName.replace(/\\/g, '/'))
                .filter(f => !f.includes('node_modules'))
            : [];
    }
}
