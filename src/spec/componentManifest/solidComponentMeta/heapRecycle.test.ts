import ts from '@typescript/typescript6';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SolidComponentMetaManager } from '../../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

function writeButtonFixture() {
    const dir = createSpecTempDir(tempDirs);

    writeSpecFiles(dir, {
        'tsconfig.json': JSON.stringify({
            compilerOptions: {
                strict: true,
                jsx: 'preserve',
                skipLibCheck: true,
                esModuleInterop: true,
                module: 'ESNext',
                moduleResolution: 'bundler',
                target: 'ES2020',
            },
            include: ['.'],
        }),
        'Button.tsx': `
            export function Button(props: { label: string }) {
                return null;
            }
        `,
    });

    return join(dir, 'Button.tsx');
}

describe('SolidComponentMetaManager heap recycle', () => {
    it('rebuilds the TS program when heap usage crosses the threshold', () => {
        const buttonPath = writeButtonFixture();
        const manager = new SolidComponentMetaManager(ts, 0);
        const before = manager.getProjectForFile(buttonPath);

        manager.extractFromComponentFile(buttonPath, 'Button');

        const after = manager.getProjectForFile(buttonPath);

        manager.dispose();

        expect(after).not.toBe(before);
    });

    it('keeps the TS program when heap usage stays below the threshold', () => {
        const buttonPath = writeButtonFixture();
        const manager = new SolidComponentMetaManager(ts, Number.POSITIVE_INFINITY);
        const before = manager.getProjectForFile(buttonPath);

        manager.extractFromComponentFile(buttonPath, 'Button');

        const after = manager.getProjectForFile(buttonPath);

        manager.dispose();

        expect(after).toBe(before);
    });

    it('still extracts after a recycle', () => {
        const buttonPath = writeButtonFixture();
        const manager = new SolidComponentMetaManager(ts, 0);

        manager.extractFromComponentFile(buttonPath, 'Button');

        const doc = manager.extractFromComponentFile(buttonPath, 'Button');

        manager.dispose();

        expect(doc?.props['label']).toMatchObject({
            name: 'label',
            required: true,
            type: { name: 'string' },
        });
    });
});
