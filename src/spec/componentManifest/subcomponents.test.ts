import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCsf } from 'storybook/internal/csf-tools';
import { afterEach, describe, expect, it } from 'vitest';

import { findExactComponentMatch, getComponents } from '../../internal/componentManifest/getComponents';
import { extractDeclaredSubcomponents } from '../../internal/componentManifest/subcomponents';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('extractDeclaredSubcomponents', () => {
    it('resolves Header from meta.subcomponents without JSX in the story', async() => {
        const dir = createSpecTempDir(tempDirs);

        writeSpecFiles(dir, {
            'Card.tsx': `
                export function Header(props: { heading: string }) {
                    return null;
                }
                export function Footer(props: { note: string }) {
                    return null;
                }
                function CardRoot(props: { title: string }) {
                    return null;
                }
                export const Card = Object.assign(CardRoot, { Header, Footer });
            `,
            'Card.stories.ts': `
                import { Card } from './Card';

                const meta = {
                    title: 'Example/Card',
                    component: Card,
                    subcomponents: { Header: Card.Header, Footer: Card.Footer },
                };

                export default meta;

                export const Default = {
                    args: { title: 'Invoice' },
                };
            `,
        });

        const storyPath = join(dir, 'Card.stories.ts');
        const csf = loadCsf(readFileSync(storyPath, 'utf8'), { makeTitle: () => 'Example/Card' }).parse();
        const declared = extractDeclaredSubcomponents(csf);

        expect(declared).toEqual([
            { name: 'Header', componentName: 'Card.Header' },
            { name: 'Footer', componentName: 'Card.Footer' },
        ]);

        const allComponents = await getComponents({
            csf: csf as Parameters<typeof getComponents>[0]['csf'],
            storyFilePath: storyPath,
            additionalComponentNames: declared.map(item => item.componentName),
        });
        const header = findExactComponentMatch(allComponents, 'Card.Header');

        expect(header?.path).toBe(join(dir, 'Card.tsx'));
        expect(header?.componentName).toBe('Card.Header');
        expect(allComponents.some(component => component.componentName === 'Header' && !component.member)).toBe(false);
    });

    it('supports shorthand identifier subcomponents', () => {
        const csf = loadCsf(
            `
                import { Header } from './Card';

                const meta = {
                    title: 'Example/Card',
                    subcomponents: { Header },
                };

                export default meta;

                export const Default = {};
            `,
            { makeTitle: () => 'Example/Card' }
        ).parse();

        expect(extractDeclaredSubcomponents(csf)).toEqual([
            { name: 'Header', componentName: 'Header' },
        ]);
    });
});
