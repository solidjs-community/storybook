import { resolve } from 'node:path';

import { getOrCreateSolidComponentMetaManager } from './solidComponentMeta/SolidComponentMetaManager';
import { solidComponentDocToDocgenInfo } from './toDocgenInfo';

import type { Plugin } from 'vite';

const INCLUDE_ID = /\.(?:tsx|jsx)$/;
const EXCLUDE_ID = /\.stories\.(?:tsx|jsx|ts|js)$|\?/;

export function solidComponentMetaPlugin(options?: { enabled?: boolean }): Plugin {
    const enabled = options?.enabled !== false;

    return {
        name: 'storybook:solid-component-meta',
        enforce: 'pre',

        configureServer() {
            void getOrCreateSolidComponentMetaManager(true);
        },

        transform: {
            filter: {
                id: {
                    include: INCLUDE_ID,
                    exclude: EXCLUDE_ID,
                },
            },
            async handler(code, id) {
                if (!enabled) {
                    return null;
                }

                if (id.includes('?')) {
                    return null;
                }

                const filePath = resolve(id);
                const manager = await getOrCreateSolidComponentMetaManager(true);

                if (!manager) {
                    return null;
                }

                const docs = manager.extractAllExportsFromFile(filePath);

                if (docs.length === 0) {
                    return null;
                }

                const injections = docs
                    .map((doc) => {
                        const useDisplayName = doc.exportName === 'default'
                            && doc.displayName
                            && /^[$A-Z_][\w$]*$/i.test(doc.displayName);
                        const target = useDisplayName ? doc.displayName! : doc.exportName;
                        const info = JSON.stringify(solidComponentDocToDocgenInfo(doc));

                        return `${ target }.__docgenInfo = ${ info };`;
                    })
                    .join('\n');

                if (!injections) {
                    return null;
                }

                return {
                    code: `${ code }\n\n${ injections }\n`,
                    map: null,
                };
            },
        },
    };
}
