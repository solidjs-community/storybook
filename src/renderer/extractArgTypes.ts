import { extractProps } from './extractProps';

import type { ArgTypesExtractor, PropDef } from 'storybook/internal/docs-tools';
import type { StrictArgTypes, StrictInputType } from 'storybook/internal/types';


export const extractArgTypes: ArgTypesExtractor = (component): StrictArgTypes | null => {
    if (component) {
        const { rows } = extractProps(component);

        if (rows) {
            return rows.reduce((acc: StrictArgTypes, row: PropDef) => {
                const {
                    name,
                    description,
                    type,
                    sbType,
                    defaultValue,
                    jsDocTags,
                    required,
                } = row;

                const result: StrictInputType = {
                    name,
                    type: { required, ...sbType },
                    table: {
                        jsDocTags,
                    },
                };

                if (description != null) {
                    result.description = description;
                }

                if (type != null) {
                    result.table!.type = type;
                }

                if (defaultValue != null) {
                    result.table!.defaultValue = defaultValue;
                }

                acc[name] = result;

                return acc;
            }, {});
        }
    }

    return null;
};
