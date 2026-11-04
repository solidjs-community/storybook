import ts from '@typescript/typescript6';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractDocgen } from '../../internal/componentManifest/docgen/docgen-worker';
import { SolidComponentMetaManager } from '../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

import type { DocgenProviderInput } from 'storybook/internal/types';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

const tsconfig = JSON.stringify({
    compilerOptions: {
        strict: true,
        jsx: 'preserve',
        skipLibCheck: true,
        esModuleInterop: true,
        module: 'ESNext',
        moduleResolution: 'bundler',
        target: 'ES2020',
    },
    include: ['*.tsx'],
});

const buttonComponent = `
    interface ButtonProps {
        label: string;
    }

    /**
     * A clickable button.
     * @summary The primary action button.
     */
    export function Button(props: ButtonProps) {
        return null;
    }
`;

/** Writes the files and runs the docgen worker on \`Button.stories.tsx\`. */
async function runDocgen(files: Record<string, string>) {
    const dir = createSpecTempDir(tempDirs);

    writeSpecFiles(dir, { 'tsconfig.json': tsconfig, ...files });

    const importPath = `./${ relative(process.cwd(), join(dir, 'Button.stories.tsx')) }`;
    const entry = {
        type: 'story',
        subtype: 'story',
        id: 'example-button--primary',
        name: 'Primary',
        title: 'Example/Button',
        importPath,
        tags: [],
    } as DocgenProviderInput['entry'];
    const manager = new SolidComponentMetaManager(ts);

    try {
        return { importPath, payload: await extractDocgen(manager, { entry }) };
    }
    finally {
        manager.dispose();
    }
}

describe('docgen worker payload', () => {
    it('takes the description from the component JSDoc and adds its summary', async() => {
        const { importPath, payload } = await runDocgen({
            'Button.tsx': buttonComponent,
            'Button.stories.tsx': `
                import { Button } from './Button';

                export default { title: 'Example/Button', component: Button };

                export const Primary = { args: { label: 'Click' } };
            `,
        });

        expect(payload).toMatchObject({
            id: 'example-button',
            name: 'Button',
            path: importPath,
            description: 'A clickable button.',
            summary: 'The primary action button.',
        });
        expect(payload?.error).toBeUndefined();
    });

    it('lets the meta JSDoc win over the component JSDoc, like React', async() => {
        const { payload } = await runDocgen({
            'Button.tsx': buttonComponent,
            'Button.stories.tsx': `
                import { Button } from './Button';

                /** Buttons trigger actions. */
                export default { title: 'Example/Button', component: Button };

                export const Primary = { args: { label: 'Click' } };
            `,
        });

        expect(payload).toMatchObject({
            description: 'Buttons trigger actions.',
            summary: 'The primary action button.',
        });
    });

    it('returns a "No component found" error when meta has no component', async() => {
        const storyFile = `
                export default { title: 'Example/Button' };

                export const Primary = { args: { label: 'Click' } };
            `;
        const { importPath, payload } = await runDocgen({ 'Button.stories.tsx': storyFile });

        expect(payload).toMatchObject({
            id: 'example-button',
            name: 'Button',
            path: importPath,
            jsDocTags: {},
            error: { name: 'No component found' },
        });
        expect(payload?.error?.message).toContain(
            'We could not detect the component from your story file. Specify meta.component.'
        );
        // Code frame at the meta statement, then the story file.
        expect(payload?.error?.message).toMatch(/Button\.stories\.tsx: \(2:\d+\)\n> 2 \| /);
        expect(payload?.error?.message).toContain(`${ importPath }:\n${ storyFile }`);
    });

    it('returns a "No component import found" error when the component file is missing', async() => {
        const { payload } = await runDocgen({
            'Button.stories.tsx': `
                import { Button } from './Missing';

                export default { title: 'Example/Button', component: Button };

                export const Primary = { args: { label: 'Click' } };
            `,
        });

        expect(payload).toMatchObject({
            id: 'example-button',
            name: 'Button',
            error: { name: 'No component import found' },
        });
        expect(payload?.error?.message).toContain('No component file found for the "Button" component.');
    });

    it('returns a subcomponent error when a declared subcomponent has no import', async() => {
        const { payload } = await runDocgen({
            'Button.tsx': buttonComponent,
            'Button.stories.tsx': `
                import { Button } from './Button';

                const Icon = () => null;

                export default { title: 'Example/Button', component: Button, subcomponents: { Icon } };

                export const Primary = { args: { label: 'Click' } };
            `,
        });

        expect(payload?.subcomponents?.['Icon']).toMatchObject({
            name: 'Icon',
            error: {
                name: 'No component import found',
                message: 'No component file found for the "Icon" subcomponent.',
            },
        });
    });

    it('matches the component by title when meta has no component, like React', async() => {
        const { payload } = await runDocgen({
            'Button.tsx': buttonComponent,
            'Button.stories.tsx': `
                import { Button } from './Button';

                export default { title: 'Example/Button' };

                export const Primary = { render: () => <Button label="Click" /> };
            `,
        });

        expect(payload).toMatchObject({
            id: 'example-button',
            name: 'Button',
            description: 'A clickable button.',
        });
        expect(payload?.error).toBeUndefined();
    });

    describe('imports, like React', () => {
        const iconComponent = `
            /** An icon. */
            export function Icon(props: { name: string }) {
                return null;
            }
        `;
        const files = (pkg: Record<string, unknown>) => ({
            'package.json': JSON.stringify(pkg),
            'Button.tsx': buttonComponent,
            'Icon.tsx': iconComponent,
            'Button.stories.tsx': `
                import { Button } from './Button';
                import { Icon } from './Icon';

                export default { title: 'Example/Button', component: Button, subcomponents: { Icon } };

                export const Primary = { args: { label: 'Click' } };
            `,
        });

        it('imports subcomponents by the package name, and leaves the component import to story docs', async() => {
            const { payload } = await runDocgen(files({ name: '@acme/ui' }));

            expect(payload).not.toHaveProperty('import');
            expect(payload?.subcomponents?.['Icon']).toMatchObject({
                name: 'Icon',
                import: `import { Icon } from '@acme/ui';`,
            });
        });

        it('keeps the story import of a subcomponent for a private app package', async() => {
            const { payload } = await runDocgen(files({ name: 'my-app', private: true }));

            expect(payload?.subcomponents?.['Icon']?.['import']).toBe(`import { Icon } from './Icon';`);
        });
    });
});
