import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recast } from 'storybook/internal/babel';
import { getStoryImportPathFromEntry, STORY_FILE_TEST_REGEXP } from 'storybook/internal/common';
import { storyNameFromExport } from 'storybook/internal/csf';
import { extractDescription, loadCsf } from 'storybook/internal/csf-tools';

import { getCodeSnippet } from '../../codeExamples/generateCodeSnippet';

import type { StoryDocsPayload, StoryDocsProviderInput, StoryDocsProviderPreset } from 'storybook/internal/types';

function readEntry(entry: StoryDocsProviderInput['entry']) {
    const importPath = getStoryImportPathFromEntry(entry);
    const title = entry.title || 'Component';
    const id = entry.id.split('--')[0] || entry.id || title.replace(/\s+/g, '');

    return { importPath, title, id };
}

export const experimental_storyDocsProvider: StoryDocsProviderPreset = async(next) => {
    return async(input) => {
        const { importPath, title, id } = readEntry(input.entry);

        if (!importPath || !STORY_FILE_TEST_REGEXP.test(importPath)) {
            return next(input);
        }

        let ours: StoryDocsPayload | undefined;

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
                        const snippet = recast.print(getCodeSnippet(csf, storyExport, componentName)).code;

                        return [
                            story.id,
                            {
                                id: story.id,
                                name,
                                snippet,
                                ...(description ? { description } : {}),
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

        if (!downstream) {
            return ours;
        }

        return { ...downstream, ...ours };
    };
}
