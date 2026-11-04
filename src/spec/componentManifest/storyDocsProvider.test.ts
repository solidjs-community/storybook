import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { experimental_storyDocsProvider } from '../../internal/componentManifest/docgen/storyDocsProvider';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

import type { IndexEntry, Options } from 'storybook/internal/types';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('experimental_storyDocsProvider', () => {
    it('warns about arg values that read names the snippet does not hold', async() => {
        const dir = createSpecTempDir(tempDirs);

        writeSpecFiles(dir, {
            'Button.stories.tsx': `
                import { Button } from './Button';

                export default { title: 'Example/Button', component: Button };

                const prefix = 'Hi';
                const label = prefix + '!';

                export const Local = { args: { label } };
                export const SelfContained = { args: { label: 'Hi' } };
            `,
        });

        const entry = {
            type: 'story',
            subtype: 'story',
            id: 'example-button--local',
            name: 'Local',
            title: 'Example/Button',
            importPath: `./${ relative(process.cwd(), join(dir, 'Button.stories.tsx')) }`,
            tags: [],
        } as IndexEntry;
        const provider = await experimental_storyDocsProvider(async() => undefined, {} as Options);
        const payload = await provider({ entry });

        expect(payload?.stories['example-button--local']).toEqual({
            id: 'example-button--local',
            name: 'Local',
            snippet: `const Local = () => <Button label={prefix + '!'} />;`,
            warning: 'Incomplete snippet: `prefix` could not be resolved statically.',
        });
        expect(payload?.stories['example-button--self-contained']).toEqual({
            id: 'example-button--self-contained',
            name: 'Self Contained',
            snippet: 'const SelfContained = () => <Button label="Hi" />;',
        });
    });
});
