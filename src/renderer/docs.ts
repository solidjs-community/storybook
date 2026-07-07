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
import type { DocgenInfo } from '../internal/componentManifest/toDocgenInfo';
import type { SolidRenderer } from '../preview/public-api';

function readDocgenInfo(component: Component): DocgenInfo | undefined {
    const candidate = component;

    if (candidate.__docgenInfo) {
        return candidate.__docgenInfo;
    }

    if (candidate.type?.__docgenInfo) {
        return candidate.type.__docgenInfo;
    }

    return undefined;
}

/** Docgen, Controls, Autodocs, and doc-mode (`storybook dev --docs`) preview annotations. */
function propDefToInputType(row: PropDef, docgenProp?: DocgenInfo['props'][string]): StrictInputType {
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

    if (docgenProp?.if) {
        result.if = docgenProp.if;
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

        const docgenInfo = readDocgenInfo(processedComponent);

        return extractedProps.reduce((acc: StrictArgTypes, { propDef }) => {
            acc[propDef.name] = propDefToInputType(propDef, docgenInfo?.props[propDef.name]);

            return acc;
        }, {});
    }
    catch {
        return null;
    }
};

/** Storybook-recommended control matchers (same defaults as `storybook init`). */
export const controlMatchers = {
    color: /(background|color)$/i,
    date: /Date$/,
} as const;

export const parameters = {
    controls: {
        matchers: controlMatchers,
    },
    docs: {
        story: { inline: true },
        extractArgTypes,
        extractComponentDescription,
    },
};

export const argTypesEnhancers: ArgTypesEnhancer<SolidRenderer>[] = [enhanceArgTypes];
