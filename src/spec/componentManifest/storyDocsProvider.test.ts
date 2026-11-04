import { join, relative } from 'node:path';
import { dedent } from 'ts-dedent';
import { afterEach, describe, expect, it } from 'vitest';

import { experimental_storyDocsProvider } from '../../internal/componentManifest/docgen/storyDocsProvider';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

import type { IndexEntry, Options } from 'storybook/internal/types';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

const BUTTON = 'export const Button = (props: { label?: string; size?: string; onClick?: () => void }) => <button>{props.label}</button>;';

function storyEntry(storyPath: string, title = 'Example/Button'): IndexEntry {
    return {
        type: 'story',
        subtype: 'story',
        id: `${ title.toLowerCase().replace('/', '-') }--primary`,
        name: 'Primary',
        title,
        importPath: `./${ relative(process.cwd(), storyPath) }`,
        tags: [],
    } as IndexEntry;
}

/** Story docs for `Button.stories.tsx` in a temp project made of `files`. */
async function storyDocs(files: Record<string, string>, features: Record<string, unknown> = {}) {
    const dir = createSpecTempDir(tempDirs);

    writeSpecFiles(dir, { 'package.json': JSON.stringify({ name: 'my-app', private: true }), ...files });

    const options = { presets: { apply: async() => features } } as unknown as Options;
    const provider = await experimental_storyDocsProvider(async() => undefined, options);

    return provider({ entry: storyEntry(join(dir, 'Button.stories.tsx')) });
}

describe('experimental_storyDocsProvider', () => {
    it('warns about arg values that read names the snippet does not hold', async() => {
        const payload = await storyDocs({
            'Button.stories.tsx': `
                import { Button } from './Button';

                export default { title: 'Example/Button', component: Button };

                const prefix = 'Hi';
                const label = prefix + '!';

                export const Local = { args: { label } };
                export const SelfContained = { args: { label: 'Hi' } };
            `,
        });

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

    it('imports the components and the arg values the snippets name, and reads story summaries', async() => {
        const payload = await storyDocs({
            'Button.tsx': BUTTON,
            'handlers.ts': dedent`
                const track = (event: string) => console.log(event);
                export const onGo = () => track('go');
            `,
            'Button.stories.tsx': dedent`
                import { Button } from './Button';
                import { onGo } from './handlers';

                export default { title: 'Example/Button', component: Button };

                /**
                 * A button that starts something.
                 * @summary Starts something.
                 */
                export const Go = { args: { label: 'Go', onClick: onGo } };
            `,
        });

        expect(payload?.import).toBe(dedent`
            import { Button } from './Button';
            import { onGo } from './handlers';
        `);
        expect(payload?.stories['example-button--go']).toEqual({
            id: 'example-button--go',
            name: 'Go',
            description: 'A button that starts something.',
            summary: 'Starts something.',
            snippet: 'const Go = () => <Button label="Go" onClick={onGo} />;',
        });
    });

    it('resolves args and stories other files and local aliases hold', async() => {
        const payload = await storyDocs({
            'Button.tsx': BUTTON,
            'Base.stories.tsx': dedent`
                import { Button } from './Button';

                export default { component: Button };
                export const Primary = { args: { label: 'Shared', size: 'lg' } };
            `,
            'Button.stories.tsx': dedent`
                import { Button } from './Button';
                import { Primary as Base } from './Base.stories';

                export default { title: 'Example/Button', component: Button };

                export const Derived = { args: { ...Base.args, label: 'Mine' } };

                const Impl = () => <Button label="Alias" />;
                export const Alias = Impl;
            `,
        });

        expect(payload?.stories['example-button--derived']).toEqual({
            id: 'example-button--derived',
            name: 'Derived',
            snippet: 'const Derived = () => <Button label="Mine" size="lg" />;',
        });
        expect(payload?.stories['example-button--alias']).toEqual({
            id: 'example-button--alias',
            name: 'Alias',
            snippet: 'const Alias = () => <Button label="Alias" />;',
        });
    });

    describe('imports a component by its package name when the package is importable', () => {
        const files = (pkg: Record<string, unknown>) => ({
            'package.json': JSON.stringify(pkg),
            'Button.tsx': BUTTON,
            'handlers.ts': 'export const onGo = () => {};',
            'Button.stories.tsx': dedent`
                import { Button } from './Button';
                import { onGo } from './handlers';

                export default { title: 'Example/Button', component: Button };
                export const Primary = { args: { onClick: onGo } };
            `,
        });

        it.each([
            ['a public package', { name: '@acme/ui' }],
            ['a private package with a main entry', { name: '@acme/ui', private: true, main: './src/index.ts' }],
            ['a private package that exports its root', { name: '@acme/ui', private: true, exports: { '.': './src/index.ts' } }],
        ])('%s', async(_, pkg) => {
            const payload = await storyDocs(files(pkg));

            // Arg values keep the module the story imports them from.
            expect(payload?.import).toBe(dedent`
                import { Button } from '@acme/ui';
                import { onGo } from './handlers';
            `);
        });

        it.each([
            ['a private app package', { name: 'my-app', private: true }],
            ['a private package that exports only subpaths', { name: '@acme/ui', private: true, exports: { './components/*': './src/components/*.tsx' } }],
        ])('keeps the story import for %s', async(_, pkg) => {
            const payload = await storyDocs(files(pkg));

            expect(payload?.import).toBe(dedent`
                import { Button } from './Button';
                import { onGo } from './handlers';
            `);
        });
    });

    it('serves no snippets or imports when experimentalCodeExamples is false', async() => {
        const payload = await storyDocs(
            {
                'Button.tsx': BUTTON,
                'Button.stories.tsx': dedent`
                    import { Button } from './Button';

                    export default { title: 'Example/Button', component: Button };

                    /** The default button. */
                    export const Primary = { args: { label: 'Go' } };
                `,
            },
            { experimentalCodeExamples: false }
        );

        expect(payload).toMatchObject({ name: 'Button', path: expect.stringContaining('Button.stories.tsx') });
        expect(payload).not.toHaveProperty('import');
        expect(payload?.stories).toEqual({
            'example-button--primary': {
                id: 'example-button--primary',
                name: 'Primary',
                description: 'The default button.',
            },
        });
    });
});
