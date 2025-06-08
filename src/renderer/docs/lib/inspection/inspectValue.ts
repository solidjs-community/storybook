import { parse } from './acornParser';

import { InspectionType } from './types';

import type { InspectionResult } from './types';

export function inspectValue(value: string): InspectionResult {
    try {
        const parsingResult = parse(value);

        return { ...parsingResult };
    }
    catch (e) {
    // do nothing.
    }

    return { inferredType: { type: InspectionType.UNKNOWN } };
}
