import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recast } from 'storybook/internal/babel';
import { storyNameFromExport } from 'storybook/internal/csf';
import { extractDescription, loadCsf } from 'storybook/internal/csf-tools';

import { getCodeSnippet } from '../../codeExamples/generateCodeSnippet';

const STORY_FILE_PATTERN = /\.(?:stories|story)\.(?:m?[jt]sx?)$/;

function readEntry(input: { entry?: Record<string, unknown> } | Record<string, unknown>) {
    const entry = 'entry' in input && input.entry && typeof input.entry === 'object'
        ? input.entry as Record<string, unknown>
        : input as Record<string, unknown>;

    const importPath = typeof entry['importPath'] === 'string'
        ? entry['importPath']
        : Array.isArray(entry['storiesImports']) && typeof entry['storiesImports'][0] === 'string'
            ? entry['storiesImports'][0]
            : undefined;
    const title = typeof entry['title'] === 'string' ? entry['title'] : 'Component';
    const id = typeof entry['id'] === 'string'
        ? (entry['id'].split('--')[0] ?? entry['id'])
        : title.replace(/\s+/g, '');

    return { importPath, title, id };
}

export async function experimental_storyDocsProvider(next: any) {
    return async(input: any) => {
        const { importPath, title, id } = readEntry(input);

        if (!importPath || !STORY_FILE_PATTERN.test(importPath)) {
            return next(input);
        }

        let ours: Record<string, unknown> | undefined;

        try {
            const storyPath = join(process.cwd(), importPath);
            const storyFile = readFileSync(storyPath, 'utf8');
            const csf = loadCsf(storyFile, { makeTitle: () => title }).parse();
            const componentName = csf._meta?.component;
            const stories = Object.fromEntries(
                Object.entries(csf._stories).map(([storyExport, story]) => {
                    const name = story.name ?? storyNameFromExport(storyExport);

                    try {
                        const description = extractDescription(csf._storyStatements[storyExport])?.trim();

                        return [
                            story.id,
                            {
                                id: story.id,
                                name,
                                snippet: recast.print(getCodeSnippet(csf, storyExport, componentName)).code,
                                description,
                            },
                        ];
                    }
                    catch(error) {
                        const err = error instanceof Error ? error : new Error(String(error));

                        return [
                            story.id,
                            {
                                id: story.id,
                                name,
                                error: { name: err.name, message: err.message },
                            },
                        ];
                    }
                })
            );

            ours = {
                id,
                name: componentName ?? title,
                path: importPath,
                stories,
            };
        }
        catch {
            ours = undefined;
        }

        const downstream = await next(input);

        if (!ours) {
            return downstream;
        }

        return { ...downstream, ...ours };
    };
}
