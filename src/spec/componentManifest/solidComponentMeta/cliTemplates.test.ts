/**
 * `create-storybook` template components (`template/cli`) document every prop,
 * so server docgen shows types and descriptions in both JS and TS init projects.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { extractComponentDoc } from '../../helpers/controlScenario';
import { cleanupSpecTempDirs, defaultCompilerOptions } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

const TEMPLATE_DIR = join(import.meta.dirname, '../../../../template/cli');

const expectedProps = {
    Button: {
        primary: ['boolean', 'Is this the principal call to action on the page?'],
        backgroundColor: ['string', 'What background color to use'],
        size: ['enum', 'How large should the button be?'],
        label: ['string', 'Button contents'],
        onClick: ['() => void', 'Optional click handler'],
    },
    Header: {
        user: ['{ name: string; }', 'The signed-in user, if any'],
        onLogin: ['() => void', 'Called when the user clicks Log in'],
        onLogout: ['() => void', 'Called when the user clicks Log out'],
        onCreateAccount: ['() => void', 'Called when the user clicks Sign up'],
    },
} as const;

describe.each([
    { lang: 'js', ext: 'jsx' },
    { lang: 'ts', ext: 'tsx' },
])('template/cli/$lang', ({ lang, ext }) => {
    const files = Object.fromEntries(
        ['Button', 'Header'].map(name => [
            `${ name }.${ ext }`,
            readFileSync(join(TEMPLATE_DIR, lang, `${ name }.${ ext }`), 'utf8'),
        ])
    );

    it.each(Object.keys(expectedProps) as (keyof typeof expectedProps)[])('%s props have types and descriptions', (name) => {
        const doc = extractComponentDoc({
            files,
            entryFile: `${ name }.${ ext }`,
            exportName: name,
            tempDirs,
            compilerOptions: { ...defaultCompilerOptions(), allowJs: true },
        });

        const actual = Object.fromEntries(
            Object.values(doc?.props ?? {}).map(prop => [prop.name, [prop.type.name, prop.description]])
        );

        expect(actual).toEqual(expectedProps[name]);
    });
});
