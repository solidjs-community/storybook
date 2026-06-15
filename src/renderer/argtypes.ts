import {
    enhanceArgTypes,
    extractComponentDescription,
    extractComponentProps,
    hasDocgen,
    type ArgTypesExtractor,
    type Component,
    type PropDef,
} from 'storybook/internal/docs-tools';

import type { ArgTypesEnhancer, StrictArgTypes, StrictInputType } from 'storybook/internal/types';
import type { SolidRenderer } from '../preview/public-api';

function propDefToInputType(row: PropDef): StrictInputType {
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

    return result;
}

/** Reads `__docgenInfo` injected at build time by solid-component-meta. */
const extractArgTypes: ArgTypesExtractor = (component): StrictArgTypes | null => {
    if (!component) {
        return null;
    }

    try {
        let processedComponent: Component = component;

        if (!hasDocgen(component) && component.type != null) {
            processedComponent = component.type;
        }

        const extractedProps = extractComponentProps(processedComponent, 'props');

        if (!Array.isArray(extractedProps) || extractedProps.length === 0) {
            return null;
        }

        return extractedProps.reduce((acc: StrictArgTypes, { propDef }) => {
            acc[propDef.name] = propDefToInputType(propDef);

            return acc;
        }, {});
    }
    catch {
        return null;
    }
};

export const parameters = {
    docs: {
        extractArgTypes,
        extractComponentDescription,
    },
};

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [enhanceArgTypes];
