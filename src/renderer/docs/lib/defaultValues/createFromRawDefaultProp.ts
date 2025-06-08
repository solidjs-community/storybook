import { isFunction, isPlainObject, isString } from 'es-toolkit/compat';
import {
    createSummaryValue,
    isTooLongForDefaultValueSummary,
    type PropDef,
    type PropDefaultValue,
} from 'storybook/internal/docs-tools';

import { ELEMENT_CAPTION, FUNCTION_CAPTION, OBJECT_CAPTION } from '../captions';

import { inspectValue } from '../inspection';
import { isHtmlTag } from '../isHtmlTag';
import { generateArray } from './generateArray';
import { generateObject } from './generateObject';
import { getPrettyElementIdentifier, getPrettyFuncIdentifier } from './prettyIdentifier';

import type { InspectionFunction } from '../inspection';

export type TypeResolver = (rawDefaultProp: any, propDef: PropDef) => PropDefaultValue;

export interface TypeResolvers {
    string: TypeResolver;
    object: TypeResolver;
    function: TypeResolver;
    default: TypeResolver;
}

function isSolidElement(element: any): boolean {
    return element && typeof element === 'object' && 'type' in element;
}

export function extractFunctionName(func: (...args: any[]) => any, propName: string): string | null {
    const { name } = func;

    // Comparison with the prop name is to discard inferred function names.
    if (name !== '' && name !== 'anonymous' && name !== propName) {
        return name;
    }

    return null;
}

const stringResolver: TypeResolver = (rawDefaultProp) => {
    return createSummaryValue(JSON.stringify(rawDefaultProp));
};

function generateSolidObject(rawDefaultProp: any) {
    const { type } = rawDefaultProp;
    const { displayName } = type;

    const jsx = `<${ type.name || 'Component' } />`;

    if (displayName != null) {
        const prettyIdentifier = getPrettyElementIdentifier(displayName);

        return createSummaryValue(prettyIdentifier, jsx);
    }

    if (isString(type)) {
        // This is an HTML element
        if (isHtmlTag(type)) {
            const jsxSummary = `<${ type } />`;

            if (!isTooLongForDefaultValueSummary(jsxSummary)) {
                return createSummaryValue(jsxSummary);
            }
        }
    }

    return createSummaryValue(ELEMENT_CAPTION, jsx);
}

const objectResolver: TypeResolver = (rawDefaultProp) => {
    if (isSolidElement(rawDefaultProp) && rawDefaultProp.type != null) {
        return generateSolidObject(rawDefaultProp);
    }

    if (isPlainObject(rawDefaultProp)) {
        const inspectionResult = inspectValue(JSON.stringify(rawDefaultProp));

        return generateObject(inspectionResult);
    }

    if (Array.isArray(rawDefaultProp)) {
        const inspectionResult = inspectValue(JSON.stringify(rawDefaultProp));

        return generateArray(inspectionResult);
    }

    return createSummaryValue(OBJECT_CAPTION);
};

const functionResolver: TypeResolver = (rawDefaultProp, propDef) => {
    let isElement = false;
    let inspectionResult: any;

    // Try to display the name of the component
    if (isFunction(rawDefaultProp)) {
        try {
            inspectionResult = inspectValue(rawDefaultProp.toString());
            const { hasParams, params } = inspectionResult.inferredType as InspectionFunction;

            if (hasParams) {
                // It might be a functional component accepting props
                if (params.length === 1 && params[0].type === 'ObjectPattern') {
                    isElement = true;
                }
            }
        }
        catch (e) {
            // do nothing
        }
    }

    const funcName = extractFunctionName(rawDefaultProp, propDef.name);

    if (funcName != null) {
        if (isElement) {
            return createSummaryValue(getPrettyElementIdentifier(funcName));
        }

        if (inspectionResult != null) {
            inspectionResult = inspectValue(rawDefaultProp.toString());
        }

        const { hasParams } = inspectionResult?.inferredType as InspectionFunction ?? { hasParams: false };

        return createSummaryValue(getPrettyFuncIdentifier(funcName, hasParams));
    }

    return createSummaryValue(isElement ? ELEMENT_CAPTION : FUNCTION_CAPTION);
};

const defaultResolver: TypeResolver = (rawDefaultProp) => {
    return createSummaryValue(rawDefaultProp.toString());
};

const DEFAULT_TYPE_RESOLVERS: TypeResolvers = {
    string: stringResolver,
    object: objectResolver,
    function: functionResolver,
    default: defaultResolver,
};

export function createTypeResolvers(customResolvers: Partial<TypeResolvers> = {}): TypeResolvers {
    return {
        ...DEFAULT_TYPE_RESOLVERS,
        ...customResolvers,
    };
}

// When react-docgen cannot provide a defaultValue we take it from the raw defaultProp.
// It works fine for types that are not transpiled. For the types that are transpiled, we can only provide partial support.
// This means that:
//   - The detail might not be available.
//   - Identifiers might not be "prettified" for all the types.
export function createDefaultValueFromRawDefaultProp(
    rawDefaultProp: any,
    propDef: PropDef,
    typeResolvers: TypeResolvers = DEFAULT_TYPE_RESOLVERS
): PropDefaultValue | null {
    try {
        switch (typeof rawDefaultProp) {
            case 'string':
                return typeResolvers.string(rawDefaultProp, propDef);
            case 'object':
                return typeResolvers.object(rawDefaultProp, propDef);
            case 'function': {
                return typeResolvers.function(rawDefaultProp, propDef);
            }
            case 'number':
            case 'bigint':
            case 'boolean':
            case 'symbol':
            case 'undefined':
                return typeResolvers.default(rawDefaultProp, propDef);
        }
    }
    catch (e) {
        console.error(e);
    }

    return null;
}
