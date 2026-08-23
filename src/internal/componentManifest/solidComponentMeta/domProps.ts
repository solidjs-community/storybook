import type ts from '@typescript/typescript6';

const INHERITED_DOM_PROP_ALLOWLIST = new Set([
    'accesskey',
    'aria-controls',
    'aria-current',
    'aria-describedby',
    'aria-disabled',
    'aria-expanded',
    'aria-hidden',
    'aria-label',
    'aria-labelledby',
    'aria-live',
    'class',
    'contenteditable',
    'dir',
    'draggable',
    'hidden',
    'id',
    'inert',
    'inputmode',
    'lang',
    'popover',
    'role',
    'slot',
    'spellcheck',
    'style',
    'tabIndex',
    'title',
    'translate',
]);

function isDomLibrarySource(fileName: string) {
    return fileName.endsWith('.d.ts') || fileName.includes('node_modules');
}

function isEventHandlerPropName(name: string) {
    return /^on[A-Z]/.test(name) || name.startsWith('on:') || name.startsWith('oncapture:');
}

/**
 * Solid JSX-only attribute namespaces from `JSX.DOMAttributes` / module augmentation.
 * They are compile-time JSX syntax (`<div prop:id={x} />`), not runtime prop keys on
 * `createComponent(Component, args)` — so they cannot be meaningful Storybook args.
 */
function isSolidJsxOnlyPropName(name: string) {
    return name.startsWith('use:')
        || name.startsWith('prop:')
        || name.startsWith('attr:')
        || name.startsWith('bool:')
        || name.startsWith('on:')
        || name.startsWith('oncapture:');
}

function isAllowlistedInheritedDomProp(name: string) {
    if (isEventHandlerPropName(name)) {
        return false;
    }

    if (name.startsWith('data-')) {
        return true;
    }

    return INHERITED_DOM_PROP_ALLOWLIST.has(name);
}

function isPropDeclaredInSource(prop: ts.Symbol, sourceFile: ts.SourceFile) {
    return prop.declarations?.some(declaration => declaration.getSourceFile() === sourceFile) ?? false;
}

export function propsTypeHasInterfaceHeritage(typescript: typeof ts, propsType: ts.Type) {
    if (propsType.isUnion()) {
        return false;
    }

    const symbol = propsType.getSymbol() ?? propsType.aliasSymbol;
    const declaration = symbol?.declarations?.find(typescript.isInterfaceDeclaration);

    if (!declaration) {
        return false;
    }

    return declaration.heritageClauses?.some(
        clause => clause.token === typescript.SyntaxKind.ExtendsKeyword && clause.types.length > 0
    ) ?? false;
}

export function shouldIncludeComponentProp(
    prop: ts.Symbol,
    sourceFile: ts.SourceFile,
    hasInterfaceHeritage: boolean,
    bulkExcluded: Set<string>
) {
    const propName = prop.getName();

    if (isSolidJsxOnlyPropName(propName)) {
        return false;
    }

    if (isPropDeclaredInSource(prop, sourceFile)) {
        return true;
    }

    if (hasInterfaceHeritage) {
        const declaration = prop.declarations?.[0];

        if (declaration && isDomLibrarySource(declaration.getSourceFile().fileName)) {
            return isAllowlistedInheritedDomProp(propName);
        }

        return true;
    }

    return !bulkExcluded.has(propName);
}

export function getBulkSourceExclusions(properties: ts.Symbol[]): Set<string> {
    const excluded = new Set<string>();
    const sourceCounts = new Map<string, number>();

    for (const prop of properties) {
        const declarations = prop.getDeclarations();

        if (!declarations?.length) {
            continue;
        }

        const firstDeclaration = declarations[0];

        if (!firstDeclaration) {
            continue;
        }

        const fileName = firstDeclaration.getSourceFile().fileName;

        if (fileName.endsWith('.d.ts') || fileName.includes('node_modules')) {
            sourceCounts.set(fileName, (sourceCounts.get(fileName) ?? 0) + 1);
        }
    }

    for (const [fileName, count] of sourceCounts) {
        if (count > 30) {
            for (const prop of properties) {
                const declarations = prop.getDeclarations();

                if (declarations?.[0]?.getSourceFile().fileName === fileName) {
                    excluded.add(prop.getName());
                }
            }
        }
    }

    return excluded;
}
