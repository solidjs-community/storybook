import {
    extractComponentProps,
    hasDocgen,
    TypeSystem,
    type ArgTypesExtractor,
    type Component,
    type PropDef,
} from 'storybook/internal/docs-tools';

import { enhancePropTypesProps } from './propTypes/handleProp';
import { enhanceTypeScriptProps } from './typeScript/handleProp';

import type { StrictArgTypes, StrictInputType } from 'storybook/internal/types';

function getPropDefs(component: Component, section: string): PropDef[] {
    let processedComponent = component;

    if (!hasDocgen(component) && !component.propTypes && component.type != null) {
        processedComponent = component.type;
    }

    const extractedProps = extractComponentProps(processedComponent, section);

    // eslint-disable-next-line ts/switch-exhaustiveness-check
    switch (extractedProps[0]?.typeSystem) {
        case TypeSystem.JAVASCRIPT:
            return enhancePropTypesProps(extractedProps, component);
        case TypeSystem.TYPESCRIPT:
            return enhanceTypeScriptProps(extractedProps);

        default:
            return extractedProps.map(x => x.propDef);
    }
}

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

export const extractArgTypes: ArgTypesExtractor = (component): StrictArgTypes | null => {
    if (!component) {
        return null;
    }

    const rows = getPropDefs(component, 'props');

    if (!rows.length) {
        return null;
    }

    return rows.reduce((acc: StrictArgTypes, row) => {
        acc[row.name] = propDefToInputType(row);

        return acc;
    }, {});
};
