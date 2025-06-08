import {
    TypeSystem,
    extractComponentProps,
    hasDocgen,
    type PropDef,
} from 'storybook/internal/docs-tools';

import { enhancePropTypesProps } from './docs/propTypes/handleProp';
import { enhanceTypeScriptProps } from './docs/typeScript/handleProp';

// FIXME
type Component = any;

export interface PropDefMap {
    [p: string]: PropDef;
}

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

export const extractProps = (component: Component) => ({
    rows: getPropDefs(component, 'props'),
});
