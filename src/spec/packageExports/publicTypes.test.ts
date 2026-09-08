import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { beforeAll, describe, expect, it } from 'vitest';

function typecheckPublishedExports(tsconfig: 'tsconfig.nodenext.json' | 'tsconfig.bundler.json') {
    const tsc = join(cwd(), 'node_modules/typescript/bin/tsc');
    const result = spawnSync('bun', [tsc, '-p', join(import.meta.dirname, tsconfig), '--noEmit'], {
        encoding: 'utf8',
    });

    return {
        status: result.status,
        output: `${ result.stdout }${ result.stderr }`,
    };
}

describe('published package types', () => {
    beforeAll(() => {
        const result = spawnSync('bun', ['run', 'build'], { encoding: 'utf8' });
        const output = `${ result.stdout }${ result.stderr }`;

        if (result.status !== 0) {
            throw new Error(output || `bun run build exited ${ result.status }`);
        }
    }, 60_000);

    it('exports StorybookConfig, Preview, and defineMain under NodeNext', () => {
        const { status, output } = typecheckPublishedExports('tsconfig.nodenext.json');

        expect(status, output).toBe(0);
    });

    it('exports the same members under bundler', () => {
        const { status, output } = typecheckPublishedExports('tsconfig.bundler.json');

        expect(status, output).toBe(0);
    });
});
