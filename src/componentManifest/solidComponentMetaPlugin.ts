import { resolve } from 'node:path';

import { getOrCreateSolidComponentMetaManager } from './solidComponentMeta/SolidComponentMetaManager';
import { solidComponentDocToDocgenInfo } from './toDocgenInfo';

import type { Plugin } from 'vite';

const COMPONENT_FILE_PATTERN = /\.(tsx|jsx)$/;
const STORIES_FILE_PATTERN = /\.stories\.(tsx|jsx|ts|js)$/;

export function solidComponentMetaPlugin(options?: { enabled?: boolean }): Plugin {
    const enabled = options?.enabled !== false;

    return {
        name: 'storybook:solid-component-meta',
        enforce: 'pre',

        configureServer() {
            void getOrCreateSolidComponentMetaManager(true);
        },

        async transform(code, id) {
            if (!enabled) {
                return null;
            }

            const filePath = resolve(id.split('?')[0] ?? id);

            if (!COMPONENT_FILE_PATTERN.test(filePath) || STORIES_FILE_PATTERN.test(filePath)) {
                return null;
            }

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
    };
}
