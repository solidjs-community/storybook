/**
 * Rewrite dev-only Solid import ids in emitted JS/DTS under dist/.
 * `solid-js-legacy` is a local alias for Solid 1; published legacy renderer imports `solid-js`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGACY_IMPORT_PREFIX = 'solid-js-legacy';

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function rewriteSolidRuntimeImports(outDir = 'dist') {
    const legacyImportPattern = new RegExp(
        `(["'])${ escapeRegExp(LEGACY_IMPORT_PREFIX) }(/[^'"]+)?\\1`,
        'g'
    );

    const rewriteFile = (filePath: string) => {
        const source = readFileSync(filePath, 'utf8');
        const next = source.replace(
            legacyImportPattern,
            (_, quote: string, subpath = '') => `${ quote }solid-js${ subpath }${ quote }`
        );

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
