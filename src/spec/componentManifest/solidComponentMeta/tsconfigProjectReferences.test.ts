import ts from '@typescript/typescript6';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { SolidComponentMetaManager } from '../../../internal/componentManifest/solidComponentMeta/SolidComponentMetaManager';
import { findTsConfigForFile } from '../../../internal/componentManifest/solidComponentMeta/findTsConfigForFile';
import { cleanupSpecTempDirs, createSpecTempDir, writeSpecFiles } from '../../helpers/tempProject';

const tempDirs: string[] = [];

afterEach(() => {
    cleanupSpecTempDirs(tempDirs);
});

describe('findTsConfigForFile — project references', () => {
    it('uses the referenced package tsconfig, not the solution-style root', () => {
        const dir = createSpecTempDir(tempDirs);

        writeSpecFiles(dir, {
            'tsconfig.json': JSON.stringify({
                files: [],
                references: [{ path: './packages/ui' }],
            }),
            'packages/ui/tsconfig.json': JSON.stringify({
                compilerOptions: {
                    strict: true,
                    jsx: 'preserve',
                    skipLibCheck: true,
                    esModuleInterop: true,
                    module: 'ESNext',
                    moduleResolution: 'bundler',
                    target: 'ES2020',
                },
                include: ['src'],
            }),
            'packages/ui/src/Button.tsx': `
                export function Button(props: { label: string }) {
                    return null;
                }
            `,
        });

        const buttonPath = join(dir, 'packages/ui/src/Button.tsx');
        const matched = findTsConfigForFile(ts, buttonPath);

        expect(matched?.replace(/\\/g, '/')).toMatch(/packages\/ui\/tsconfig\.json$/);

        const manager = new SolidComponentMetaManager(ts);
        const project = manager.getProjectForFile(buttonPath);

        expect(project.configFileName?.replace(/\\/g, '/')).toMatch(/packages\/ui\/tsconfig\.json$/);

        const doc = manager.extractFromComponentFile(buttonPath, 'Button');

        manager.dispose();

        expect(doc?.props['label']).toMatchObject({
            name: 'label',
            required: true,
            type: { name: 'string' },
        });
    });
});
