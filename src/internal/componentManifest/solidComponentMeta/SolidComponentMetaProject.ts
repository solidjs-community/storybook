import { createLanguage, FileMap, type SourceScript } from '@volar/language-core';
import { createLanguageServiceHost, resolveFileLanguageId } from '@volar/typescript';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import {
    type FileChange,
    type FileSnapshotCache,
    ProgramBackedProject,
    ProjectFileTracker,
} from 'storybook/internal/component-meta';

import { collectCsfArgNamesFromSource } from '../collectCsfArgNames';
import {
    resolveFromComponentFile,
    resolveFromMetaComponent,
    resolvePropsFromStoryFile,
    serializeComponentDoc
} from './resolveProps';

import type ts from '@typescript/typescript6';
import type { ComponentRef, SolidComponentDoc, StoryExtractionEntry } from '../types';

/**
 * One TypeScript LanguageService per tsconfig, shaped like React's `ComponentMetaProject`. Core's
 * `ProgramBackedProject` answers the manager's membership and lifecycle questions and its
 * `ProjectFileTracker` owns snapshot freshness; this class builds the Volar-backed service and
 * runs the Solid prop extraction.
 */
export class SolidComponentMetaProject extends ProgramBackedProject<ts.IScriptSnapshot, ts.SourceFile | undefined> {
    protected readonly service: ts.LanguageService;
    protected readonly files: ProjectFileTracker<ts.IScriptSnapshot>;
    private entries: StoryExtractionEntry[] = [];
    private warmupTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly typescript: typeof ts,
        private readonly commandLine: ts.ParsedCommandLine,
        readonly configFileName: string | undefined,
        fsFileSnapshots: FileSnapshotCache<ts.IScriptSnapshot>,
        getCommandLineFn?: () => ts.ParsedCommandLine
    ) {
        super();
        this.files = new ProjectFileTracker(
            typescript,
            commandLine,
            fsFileSnapshots,
            text => typescript.ScriptSnapshot.fromString(text),
            getCommandLineFn
        );

        const language = createLanguage(
            [{ getLanguageId: fileName => resolveFileLanguageId(fileName) }],
            new FileMap(typescript.sys.useCaseSensitiveFileNames) as Map<string, SourceScript<string>>,
            (fileName, includeFsFiles) => {
                if (!includeFsFiles) {
                    return;
                }

                const snapshot = this.files.getSnapshot(fileName);

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
            getProjectVersion: () => this.files.getProjectVersion(),
            getScriptFileNames: () => this.files.getScriptFileNames(),
        };

        // Volar is typed against `typescript`; we always pass @typescript/typescript6 (same API shape).
        const { languageServiceHost } = createLanguageServiceHost(
            typescript as never,
            typescript.sys as never,
            language,
            s => s,
            projectHost as never
        );

        this.service = typescript.createLanguageService(languageServiceHost as never);
    }

    getCommandLine(): ts.ParsedCommandLine {
        return this.commandLine;
    }

    /** Cancels the warmup the base does not know about. */
    override dispose() {
        clearTimeout(this.warmupTimer);
        super.dispose();
    }

    /** Re-extracts the last story batch in the background after a change, so the next request is warm. */
    override onFilesChanged(changes: FileChange[]) {
        const program = this.service.getProgram();
        const versionMoved = this.files.onFilesChanged(changes, fileName => !!program?.getSourceFile(fileName));

        if (versionMoved && this.entries.length > 0) {
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

        this.files.ensureFiles(allFiles);
        this.files.ensureFresh(allFiles);

        const program = this.service.getProgram();

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

                let referencedArgNames: Set<string> | undefined;

                try {
                    referencedArgNames = collectCsfArgNamesFromSource(readFileSync(entry.storyPath, 'utf8'));
                }
                catch {
                    referencedArgNames = undefined;
                }

                const doc = serializeComponentDoc(this.typescript, checker, {
                    sourceFile: serializationContext.sourceFile,
                    resolvedComponent,
                    ...(referencedArgNames ? { referencedArgNames } : {}),
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

    extractFromComponentFile(
        componentPath: string,
        exportName: string,
        referencedArgNames?: ReadonlySet<string>
    ): SolidComponentDoc | undefined {
        this.files.ensureFiles([componentPath]);
        this.files.ensureFresh([componentPath]);

        const program = this.service.getProgram();

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
            ...(referencedArgNames ? { referencedArgNames } : {}),
        });
    }

    extractAllExportsFromFile(componentPath: string): SolidComponentDoc[] {
        this.files.ensureFiles([componentPath]);
        this.files.ensureFresh([componentPath]);

        const program = this.service.getProgram();

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
}
