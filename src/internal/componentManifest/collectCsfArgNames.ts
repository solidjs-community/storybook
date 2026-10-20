import { isStringLiteral, loadCsf, unwrapExpression } from 'storybook/internal/csf-tools';

import type { CsfFile, ESTreeNode } from 'storybook/internal/csf-tools';

function addObjectKeys(node: ESTreeNode | undefined, names: Set<string>) {
    const objectExpression = unwrapExpression(node);

    if (objectExpression?.type !== 'ObjectExpression') {
        return;
    }

    for (const property of objectExpression.properties) {
        if (property.type !== 'Property' || property.method || property.kind !== 'init' || property.computed) {
            continue;
        }

        if (property.key.type === 'Identifier') {
            names.add(property.key.name);
        }
        else if (isStringLiteral(property.key)) {
            names.add(property.key.value);
        }
    }
}

export function collectCsfArgNames(csf: CsfFile): Set<string> {
    const names = new Set<string>();

    addObjectKeys(csf._metaAnnotations['args'], names);

    for (const annotations of Object.values(csf._storyAnnotations)) {
        addObjectKeys(annotations['args'], names);
    }

    return names;
}

export function collectCsfArgNamesFromSource(source: string): Set<string> {
    try {
        const csf = loadCsf(source, { makeTitle: () => 'Component' }).parse();

        return collectCsfArgNames(csf);
    }
    catch {
        return new Set();
    }
}
