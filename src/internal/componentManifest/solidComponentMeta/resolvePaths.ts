import {
    MAX_UNWRAP_DEPTH,
    resolveAliasedSymbol,
    SOLID_COMPONENT_TYPE_ALIASES,
} from './typeUtils';

import type ts from '@typescript/typescript6';
import type { ComponentRef, ResolvedComponent } from '../types';

export function resolvePropsFromComponentType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    componentType: ts.Type
): ts.Type | undefined {
    const callSigs = componentType.getCallSignatures();

    if (callSigs.length > 0) {
        const sig = callSigs[0];

        if (sig) {
            if (sig.parameters.length === 0) {
                return checker.getVoidType();
            }

            const propsParam = sig.parameters[0];

            if (propsParam) {
                const propsType = checker.getTypeOfSymbol(propsParam);

                if (!(propsType.flags & typescript.TypeFlags.Any)) {
                    return propsType;
                }
            }
        }
    }

    for (const sig of componentType.getConstructSignatures()) {
        const propsSym = sig.getReturnType().getProperty('props');

        if (propsSym) {
            const propsType = checker.getTypeOfSymbol(propsSym);

            if (!(propsType.flags & typescript.TypeFlags.Any)) {
                return propsType;
            }
        }
    }

    const aliasSymbol = componentType.aliasSymbol;

    if (aliasSymbol && componentType.aliasTypeArguments?.length === 1) {
        const aliasName = aliasSymbol.getName();

        if (SOLID_COMPONENT_TYPE_ALIASES.test(aliasName)) {
            const propsTypeArg = componentType.aliasTypeArguments[0];

            if (propsTypeArg && !(propsTypeArg.flags & typescript.TypeFlags.Any)) {
                return propsTypeArg;
            }
        }
    }

    return undefined;
}

function extractPropsFromJsx(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    node: ts.JsxSelfClosingElement | ts.JsxOpeningElement
) {
    const sig = checker.getResolvedSignature(node);

    if (!sig) {
        return undefined;
    }

    const params = sig.getParameters();

    if (params.length === 0) {
        return checker.getTypeFromTypeNode(typescript.factory.createTypeLiteralNode([]));
    }

    const propsParam = params[0];

    if (!propsParam) {
        return checker.getTypeFromTypeNode(typescript.factory.createTypeLiteralNode([]));
    }

    return checker.getTypeOfSymbolAtLocation(propsParam, node);
}

function resolveComponentFromJsx(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    node: ts.JsxSelfClosingElement | ts.JsxOpeningElement,
    componentRef: ComponentRef,
    symbol: ts.Symbol
): ResolvedComponent | undefined {
    const propsType = extractPropsFromJsx(typescript, checker, node);

    if (!propsType) {
        return undefined;
    }

    return {
        componentRef,
        propsType,
        symbol: resolveAliasedSymbol(typescript, checker, symbol),
    };
}

export function resolvePropsFromStoryFile(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    storySourceFile: ts.SourceFile,
    componentRef: ComponentRef
): ResolvedComponent | undefined {
    const importSpecifier = componentRef.importId;
    const importName = componentRef.importName;
    const memberAccess = componentRef.member;

    if (!importSpecifier || !importName) {
        return undefined;
    }

    let importSymbol: ts.Symbol | undefined;

    for (const stmt of storySourceFile.statements) {
        if (!typescript.isImportDeclaration(stmt)) {
            continue;
        }

        const moduleSpec = stmt.moduleSpecifier;

        if (!typescript.isStringLiteral(moduleSpec) || moduleSpec.text !== importSpecifier) {
            continue;
        }

        const clause = stmt.importClause;

        if (!clause) {
            continue;
        }

        if (importName === 'default') {
            if (clause.name) {
                importSymbol = checker.getSymbolAtLocation(clause.name);
            }
            else if (clause.namedBindings && typescript.isNamedImports(clause.namedBindings)) {
                for (const spec of clause.namedBindings.elements) {
                    if ((spec.propertyName ?? spec.name).text === 'default') {
                        importSymbol = checker.getSymbolAtLocation(spec.name);
                        break;
                    }
                }
            }
        }
        else if (clause.namedBindings && typescript.isNamedImports(clause.namedBindings)) {
            for (const spec of clause.namedBindings.elements) {
                if ((spec.propertyName ?? spec.name).text === importName) {
                    importSymbol = checker.getSymbolAtLocation(spec.name);
                    break;
                }
            }
        }

        if (!importSymbol && memberAccess && clause.namedBindings && typescript.isNamespaceImport(clause.namedBindings)) {
            importSymbol = checker.getSymbolAtLocation(clause.namedBindings.name);
        }

        if (importSymbol) {
            break;
        }
    }

    if (!importSymbol) {
        return undefined;
    }

    let result: ResolvedComponent | undefined;

    function visit(node: ts.Node) {
        if (result) {
            return;
        }

        if (typescript.isJsxSelfClosingElement(node) || typescript.isJsxOpeningElement(node)) {
            const tagName = node.tagName;

            if (memberAccess) {
                if (typescript.isPropertyAccessExpression(tagName) && tagName.name.text === memberAccess) {
                    const leftSym = checker.getSymbolAtLocation(tagName.expression);

                    if (leftSym && importSymbol && leftSym === importSymbol) {
                        const memberSymbol = (
                            checker.getSymbolAtLocation(tagName.name)
                            ?? checker.getTypeAtLocation(tagName.expression).getProperty(tagName.name.text)
                            ?? importSymbol
                        );

                        result = resolveComponentFromJsx(
                            typescript,
                            checker,
                            node,
                            componentRef,
                            memberSymbol
                        );

                        return;
                    }
                }
            }
            else if (typescript.isIdentifier(tagName)) {
                const sym = checker.getSymbolAtLocation(tagName);

                if (sym && importSymbol && sym === importSymbol) {
                    result = resolveComponentFromJsx(typescript, checker, node, componentRef, sym);

                    return;
                }
            }
        }

        typescript.forEachChild(node, visit);
    }

    visit(storySourceFile);

    return result;
}

export function resolveFromMetaComponent(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    storySourceFile: ts.SourceFile,
    componentRef: ComponentRef
): ResolvedComponent | undefined {
    const { member: memberAccess } = componentRef;
    const moduleSymbol = checker.getSymbolAtLocation(storySourceFile);

    if (!moduleSymbol) {
        return undefined;
    }

    const defaultExport = checker.getExportsOfModule(moduleSymbol).find(e => e.getName() === 'default');

    if (!defaultExport) {
        return undefined;
    }

    const componentProp = checker.getTypeOfSymbol(defaultExport).getProperty('component');

    if (!componentProp) {
        return undefined;
    }

    let componentType = checker.getTypeOfSymbol(componentProp);
    let selectedSymbol: ts.Symbol | undefined;

    if (componentProp.valueDeclaration && typescript.isPropertyAssignment(componentProp.valueDeclaration)) {
        selectedSymbol = checker.getSymbolAtLocation(componentProp.valueDeclaration.initializer) ?? undefined;
    }
    else {
        selectedSymbol = componentType.getSymbol?.();
    }

    if (memberAccess) {
        const prop = componentType.getProperty(memberAccess);

        if (prop) {
            componentType = checker.getTypeOfSymbol(prop);
            selectedSymbol = prop;
        }
        else {
            return undefined;
        }
    }

    const propsType = resolvePropsFromComponentType(typescript, checker, componentType);

    if (!propsType || !selectedSymbol) {
        return undefined;
    }

    return {
        componentRef,
        propsType,
        symbol: selectedSymbol,
    };
}

/** Path 3: resolve props directly from the component source file export. */
export function resolveFromComponentFile(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    componentSourceFile: ts.SourceFile,
    exportName: string,
    componentRef: ComponentRef
): ResolvedComponent | undefined {
    const moduleSymbol = checker.getSymbolAtLocation(componentSourceFile);

    if (!moduleSymbol) {
        return undefined;
    }

    const exportSymbol = exportName === 'default'
        ? checker.getExportsOfModule(moduleSymbol).find(e => e.getName() === 'default')
        : checker.getExportsOfModule(moduleSymbol).find(e => e.getName() === exportName);

    if (!exportSymbol?.valueDeclaration) {
        return undefined;
    }

    const componentType = checker.getTypeOfSymbolAtLocation(exportSymbol, exportSymbol.valueDeclaration);
    const propsType = resolvePropsFromComponentType(typescript, checker, componentType);

    if (!propsType) {
        return undefined;
    }

    return {
        componentRef,
        propsType,
        symbol: resolveAliasedSymbol(typescript, checker, exportSymbol),
    };
}

export function isSolidComponentType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type,
    depth = 0
): boolean {
    if (depth > MAX_UNWRAP_DEPTH) {
        return false;
    }

    const callSigs = type.getCallSignatures();

    if (callSigs.length > 0) {
        return true;
    }

    const typeString = checker.typeToString(type);

    if (/(?:Component|VoidComponent|ParentComponent|FlowComponent)</.test(typeString)) {
        return true;
    }

    const symbol = type.getSymbol();

    if (symbol) {
        const declarations = symbol.getDeclarations();

        if (declarations?.some(
            decl => typescript.isFunctionDeclaration(decl)
                || typescript.isArrowFunction(decl)
                || typescript.isFunctionExpression(decl)
        )) {
            return true;
        }
    }

    return false;
}
