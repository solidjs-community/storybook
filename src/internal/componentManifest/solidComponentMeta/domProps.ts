import type ts from '@typescript/typescript6';

const ALWAYS_INHERITED_DOM_PROPS = new Set([
    'class',
    'style',
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

function namesMatchCaseInsensitive(names: ReadonlySet<string>, propName: string) {
    if (names.has(propName)) {
        return true;
    }

    const lower = propName.toLowerCase();

    for (const name of names) {
        if (name.toLowerCase() === lower) {
            return true;
        }
    }

    return false;
}

function shouldIncludeInheritedDomProp(
    name: string,
    referencedArgNames?: ReadonlySet<string>
) {
    if (isEventHandlerPropName(name)) {
        return false;
    }

    if (namesMatchCaseInsensitive(ALWAYS_INHERITED_DOM_PROPS, name)) {
        return true;
    }

    return referencedArgNames !== undefined && namesMatchCaseInsensitive(referencedArgNames, name);
}

function isPropDeclaredInSource(prop: ts.Symbol, sourceFile: ts.SourceFile) {
    return prop.declarations?.some(declaration => declaration.getSourceFile() === sourceFile) ?? false;
}

const DOM_ATTRIBUTES_TYPE_NAMES = new Set([
    'ElementAttributes',
    'HTMLAttributes',
    'MathMLAttributes',
    'SVGAttributes',
    'SvgSVGAttributes',
]);

function isIntersectionType(typescript: typeof ts, type: ts.Type): type is ts.IntersectionType {
    return (type.flags & typescript.TypeFlags.Intersection) !== 0;
}

function typeHasDomInterfaceHeritage(
    typescript: typeof ts,
    type: ts.Type,
    seen: Set<ts.Type>
): boolean {
    if (seen.has(type)) {
        return false;
    }

    seen.add(type);

    if (type.isUnion()) {
        return false;
    }

    if (isIntersectionType(typescript, type)) {
        return type.types.some(part => typeHasDomInterfaceHeritage(typescript, part, seen));
    }

    const symbol = type.getSymbol() ?? type.aliasSymbol;
    const name = symbol?.getName();

    if (name && DOM_ATTRIBUTES_TYPE_NAMES.has(name)) {
        return true;
    }

    const declaration = symbol?.declarations?.find(typescript.isInterfaceDeclaration);

    if (!declaration) {
        return false;
    }

    return declaration.heritageClauses?.some(
        clause => clause.token === typescript.SyntaxKind.ExtendsKeyword && clause.types.length > 0
    ) ?? false;
}

export function propsTypeHasInterfaceHeritage(typescript: typeof ts, propsType: ts.Type) {
    return typeHasDomInterfaceHeritage(typescript, propsType, new Set());
}

export function shouldIncludeComponentProp(
    prop: ts.Symbol,
    sourceFile: ts.SourceFile,
    hasInterfaceHeritage: boolean,
    bulkExcluded: Set<string>,
    referencedArgNames?: ReadonlySet<string>
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
            return shouldIncludeInheritedDomProp(propName, referencedArgNames);
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
