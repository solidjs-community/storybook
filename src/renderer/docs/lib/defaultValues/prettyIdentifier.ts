import { InspectionType } from '../inspection';

import type { InspectionIdentifiableInferedType } from '../inspection';

export function getPrettyFuncIdentifier(identifier: string, hasArguments: boolean): string {
    return hasArguments ? `${ identifier }( ... )` : `${ identifier }()`;
}

export function getPrettyElementIdentifier(identifier: string) {
    return `<${ identifier } />`;
}

export function getPrettyIdentifier(inferredType: InspectionIdentifiableInferedType): string {
    const { type, identifier } = inferredType;

    // eslint-disable-next-line ts/switch-exhaustiveness-check
    switch (type) {
        case InspectionType.FUNCTION:
            // @ts-expect-error (Converted from ts-ignore)
            return getPrettyFuncIdentifier(identifier, (inferredType).hasParams);
        case InspectionType.ELEMENT:
            // @ts-expect-error (Converted from ts-ignore)
            return getPrettyElementIdentifier(identifier);

        default:
            return identifier;
    }
}
