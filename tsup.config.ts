import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

const SOLID_RUNTIME_IMPORTS = {
    'solid-js-next': 'solid-js',
} as const;

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Rewrite dev-only Solid import ids in emitted JS and declaration files. */
function rewriteSolidRuntimeImports(outDir: string) {
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

export default defineConfig((options) => {
    return {
        entry: {
            index: 'src/index.ts',
            node: 'src/node.ts',
            renderer: 'src/renderer/index.ts',
            playwright: 'src/playwright.ts',
            'framework/preset': 'src/framework/preset.ts',
            'renderer/solid': 'src/renderer/solid.ts',
            'renderer/solid-legacy': 'src/renderer/solid-legacy.ts',
            'renderer/solid-next': 'src/renderer/solid-next.ts',
            'renderer/docs': 'src/renderer/docs.ts',
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
            '@volar/language-core',
            '@volar/typescript',
            /^@solidjs(?:\/|$)/,
            /^solid-js(?:-next)?(?:\/|$)/,
            /^storybook\//,
            'storybook-solidjs-vite/renderer/solid',
            'typescript',
            'vite-plugin-solid',
        ],
        sourcemap: true,
        treeshake: !options.watch,
        onSuccess: async() => {
            rewriteSolidRuntimeImports('dist');
        },
    };
});
