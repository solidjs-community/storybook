import type ts from 'typescript';
import type { ComponentRef, ResolvedComponent, SerializedProp, SolidComponentDoc } from '../types';

const MAX_UNWRAP_DEPTH = 5;

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

    return undefined;
}

function resolveAliasedSymbol(typescript: typeof ts, checker: ts.TypeChecker, symbol: ts.Symbol) {
    return symbol.flags & typescript.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
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
                        const propsType = extractPropsFromJsx(typescript, checker, node);

                        if (propsType) {
                            const memberSymbol = checker.getSymbolAtLocation(tagName.name)
                              ?? checker.getTypeAtLocation(tagName.expression).getProperty(tagName.name.text);

                            result = {
                                componentRef,
                                propsType,
                                symbol: memberSymbol ?? resolveAliasedSymbol(typescript, checker, importSymbol),
                            };

                            return;
                        }
                    }
                }
            }
            else if (typescript.isIdentifier(tagName)) {
                const sym = checker.getSymbolAtLocation(tagName);

                if (sym && importSymbol && sym === importSymbol) {
                    const propsType = extractPropsFromJsx(typescript, checker, node);

                    if (propsType) {
                        result = {
                            componentRef,
                            propsType,
                            symbol: resolveAliasedSymbol(typescript, checker, sym),
                        };

                        return;
                    }
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

/** Path 3: resolve props directly from the component source file export (CSF4 args-only). */
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

    if (/Component<|VoidComponent<|ParentComponent<|FlowComponent</.test(typeString)) {
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

const MAX_SERIALIZATION_DEPTH = 5;

function isLiteralType(type: ts.Type) {
    return type.isStringLiteral() || type.isNumberLiteral();
}

function serializeType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type,
    isRequired: boolean,
    depth = 0
): SerializedProp['type'] {
    if (depth > MAX_SERIALIZATION_DEPTH) {
        return { name: checker.typeToString(type) };
    }

    if (type.isUnion()) {
        const nonUndefinedTypes = type.types.filter(
            t => !(t.getFlags() & typescript.TypeFlags.Undefined)
        );
        const literalMembers = nonUndefinedTypes.filter(isLiteralType);

        if (literalMembers.length > 0 && literalMembers.length === nonUndefinedTypes.length) {
            return {
                name: 'enum',
                raw: literalMembers.map(m => checker.typeToString(m)).join(' | '),
                value: literalMembers.map(m => ({
                    value: JSON.stringify(m.value),
                })),
            };
        }

        if (!isRequired && nonUndefinedTypes.length === 1 && nonUndefinedTypes.length < type.types.length) {
            const soleType = nonUndefinedTypes[0];

            if (soleType) {
                return { name: checker.typeToString(soleType) };
            }
        }
    }

    const constraint = type.getConstraint?.();

    if (constraint && constraint !== type) {
        return serializeType(typescript, checker, constraint, isRequired, depth + 1);
    }

    return { name: checker.typeToString(type), raw: checker.typeToString(type) };
}

function getBulkSourceExclusions(properties: ts.Symbol[]): Set<string> {
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

export function serializeComponentDoc(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    {
        sourceFile,
        resolvedComponent,
    }: {
        sourceFile: ts.SourceFile;
        resolvedComponent: ResolvedComponent;
    }
): SolidComponentDoc | undefined {
    const { componentRef, propsType, symbol } = resolvedComponent;
    const exportName = componentRef.importName;

    if (!exportName) {
        return undefined;
    }

    const resolved = resolveAliasedSymbol(typescript, checker, symbol);
    const contextNode = resolved.valueDeclaration ?? resolved.getDeclarations()?.[0];

    if (!contextNode) {
        return undefined;
    }

    const allProperties = propsType.getApparentProperties();
    const excluded = getBulkSourceExclusions(allProperties);
    const props: Record<string, SerializedProp> = {};

    for (const prop of allProperties) {
        if (excluded.has(prop.getName())) {
            continue;
        }

        const propType = checker.getTypeOfSymbolAtLocation(prop, contextNode);
        const isOptional = !!(prop.flags & typescript.SymbolFlags.Optional)
          || !!(propType.flags & typescript.TypeFlags.Undefined);
        const description = typescript.displayPartsToString(prop.getDocumentationComment(checker));

        props[prop.getName()] = {
            name: prop.getName(),
            ...(description ? { description } : {}),
            required: !isOptional,
            type: serializeType(typescript, checker, propType, !isOptional),
        };
    }

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    const exportSymbol = moduleSymbol
        ? checker.getExportsOfModule(moduleSymbol).find(candidate => candidate.getName() === exportName)
        : undefined;

    const displayName = componentRef.member
        ? componentRef.componentName
        : (exportSymbol?.getName() ?? componentRef.componentName);
    const description = typescript.displayPartsToString(resolved.getDocumentationComment(checker));

    return {
        displayName,
        exportName,
        filePath: componentRef.path ?? sourceFile.fileName,
        ...(description ? { description } : {}),
        props,
    };
}
