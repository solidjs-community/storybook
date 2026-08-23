/**
 * Rewrite dev-only Solid import ids in emitted JS/DTS under dist/.
 * `solid-js-next` is a local alias for Solid 2; published output must import `solid-js`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SOLID_RUNTIME_IMPORTS = {
    'solid-js-next': 'solid-js',
} as const;

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function rewriteSolidRuntimeImports(outDir = 'dist') {
    const replacements = Object.entries(SOLID_RUNTIME_IMPORTS)
        .sort(([a], [b]) => b.length - a.length);

    const rewriteFile = (filePath: string) => {
        const source = readFileSync(filePath, 'utf8');
        let next = source;

        for (const [from, to] of replacements) {
            const pattern = new RegExp(
                `(["'])${ escapeRegExp(from) }\\1`,
                'g'
            );

            next = next.replace(pattern, (_, quote: string) => `${ quote }${ to }${ quote }`);
        }

        if (next !== source) {
            writeFileSync(filePath, next);
        }
    };

    const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
            const filePath = join(dir, entry);
            const stats = statSync(filePath);

            if (stats.isDirectory()) {
                walk(filePath);
            }
            else if (/\.(?:js|d\.ts)$/.test(entry)) {
                rewriteFile(filePath);
            }
        }
    };

    walk(outDir);
}

if (import.meta.main) {
    rewriteSolidRuntimeImports();
}
