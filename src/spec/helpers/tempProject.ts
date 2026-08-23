import ts from '@typescript/typescript6';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { cwd } from 'node:process';

import { SolidComponentMetaProject } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaProject';

/** Legacy prefix when temp dirs were created in the repo root. */
export const SPEC_TEMP_PREFIX = '.solid-spec-';

const SPEC_TEMP_ROOT = join(cwd(), '.tmp', 'spec');

export function createSpecTempDir(tempDirs: string[]) {
    mkdirSync(SPEC_TEMP_ROOT, { recursive: true });

    const dir = mkdtempSync(join(SPEC_TEMP_ROOT, 'run-'));

    tempDirs.push(dir);

    return dir;
}

export function cleanupSpecTempDirs(tempDirs: string[]) {
    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();

        if (!dir) {
            continue;
        }

        try {
            rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
        }
        catch {
            // Best-effort cleanup for ephemeral spec fixtures.
        }
    }
}

/** Removes leftover spec fixture dirs from older runs (repo root + system temp). */
export function cleanupStaleSpecTempDirs() {
    try {
        for (const entry of readdirSync(cwd())) {
            if (!entry.startsWith(SPEC_TEMP_PREFIX)) {
                continue;
            }

            try {
                rmSync(join(cwd(), entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
            }
            catch {
                // Best-effort cleanup.
            }
        }
    }
    catch {
        // cwd may be unavailable in some environments.
    }

    try {
        rmSync(SPEC_TEMP_ROOT, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    }
    catch {
        // Best-effort cleanup.
    }
}

export function defaultCompilerOptions(): ts.CompilerOptions {
    return {
        strict: true,
        jsx: ts.JsxEmit.Preserve,
        esModuleInterop: true,
        skipLibCheck: true,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
    };
}

export function writeSpecFiles(dir: string, files: Record<string, string>) {
    for (const [relativePath, contents] of Object.entries(files)) {
        const filePath = join(dir, relativePath);

        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(filePath, contents);
    }
}

export function createComponentProject(options: {
    tempDirs: string[];
    source: string;
    exportName?: string;
    fileName?: string;
}) {
    const exportName = options.exportName ?? 'Example';
    const dir = createSpecTempDir(options.tempDirs);
    const filePath = join(dir, options.fileName ?? `${ exportName }.tsx`);

    writeFileSync(filePath, options.source);

    const project = new SolidComponentMetaProject(
        ts,
        {
            options: defaultCompilerOptions(),
            fileNames: [filePath],
            errors: [],
        },
        undefined,
        new Map()
    );

    return { dir, filePath, exportName, project };
}
