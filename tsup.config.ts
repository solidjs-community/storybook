import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

/** Source import ids (devDependency aliases) → peer ids emitted in `dist`. */
const SOLID_PEER_ALIASES = {
    'solid-js-v1': 'solid-js',
    'solid-js-v2': 'solid-js',
    'solid-js-v1/store': 'solid-js/store',
    'solid-js-v1/web': 'solid-js/web',
} as const;

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Rewrite alias ids to peer ids in emitted JS and declaration files. */
function rewriteSolidAliases(outDir: string) {
    const replacements = Object.entries(SOLID_PEER_ALIASES)
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

export default defineConfig((options) => {
    return {
        entry: {
            index: 'src/index.ts',
            next: 'src/next.ts',
            'framework/preset': 'src/framework/preset.ts',
            'framework/node': 'src/framework/node.ts',
            renderer: 'src/renderer/index.ts',
            'renderer/playwright': 'src/renderer/playwright.ts',
            'entry-preview/solid-1': 'src/renderer/v1/entry-preview.ts',
            'entry-preview/solid-2': 'src/renderer/v2/entry-preview.ts',
            'entry-preview/argtypes': 'src/renderer/docs/entry-preview-argtypes.ts',
            'entry-preview/docs': 'src/renderer/docs/entry-preview.ts',
        },
        format: ['esm'],
        outDir: 'dist',
        clean: true,
        dts: {
            resolve: true,
        },
        tsconfig: 'tsconfig.json',
        external: [
            '@storybook/builder-vite',
            '@storybook/global',
            /^@solidjs(?:\/|$)/,
            /^solid-js(?:-v[12])?(?:\/|$)/,
            /^storybook\//,
            'vite-plugin-solid',
        ],
        sourcemap: true,
        treeshake: !options.watch,
        onSuccess: async() => {
            rewriteSolidAliases('dist');
        },
    };
});
