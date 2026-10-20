import { types as t } from 'storybook/internal/babel';
import { loadCsf } from 'storybook/internal/csf-tools';

import type { CsfFile } from 'storybook/internal/csf-tools';

function unwrapExpression(node: t.Node | undefined): t.Node | undefined {
    let current = node;

    while (
        current
        && (
            t.isTSAsExpression(current)
            || t.isTSSatisfiesExpression(current)
            || t.isTSNonNullExpression(current)
            || t.isParenthesizedExpression(current)
        )
    ) {
        current = current.expression;
    }

    return current;
}

function addObjectKeys(node: t.Node | undefined, names: Set<string>) {
    const objectExpression = unwrapExpression(node);

    if (!objectExpression || !t.isObjectExpression(objectExpression)) {
        return;
    }

    for (const property of objectExpression.properties) {
        if (!t.isObjectProperty(property) || property.computed) {
            continue;
        }

        if (t.isIdentifier(property.key)) {
            names.add(property.key.name);
        }
        else if (t.isStringLiteral(property.key)) {
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
