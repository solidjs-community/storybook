import {
    collectComponentProperties,
    collectDiscriminatedUnionIfConditions,
    isPropOptionalInUnion,
    resolveUnionPropType,
} from './discriminatedUnion';
import {
    getBulkSourceExclusions,
    propsTypeHasInterfaceHeritage,
    shouldIncludeComponentProp,
} from './domProps';
import { resolvePropDeclarationType, serializeType } from './serializeType';
import { resolveAliasedSymbol } from './typeUtils';

import type ts from 'typescript';
import type { ResolvedComponent, SerializedProp, SolidComponentDoc } from '../types';

function extractDefaultValueFromJsDoc(
    checker: ts.TypeChecker,
    prop: ts.Symbol
): { value: string } | undefined {
    const defaultTag = prop.getJsDocTags(checker).find(tag => tag.name === 'default');
    const value = defaultTag?.text?.map(part => part.text).join('').trim();

    if (!value) {
        return undefined;
    }

    return { value };
}

function extractComponentJsDocTags(
    checker: ts.TypeChecker,
    symbol: ts.Symbol
): SolidComponentDoc['jsDocTags'] {
    const tags = symbol.getJsDocTags(checker);

    if (tags.length === 0) {
        return undefined;
    }

    const grouped: Record<string, string[]> = {};

    for (const tag of tags) {
        const value = tag.text?.map(part => part.text).join('').trim() ?? '';

        grouped[tag.name] ??= [];
        grouped[tag.name]!.push(value);
    }

    return grouped;
}

function extractDestructuringDefaultValue(
    typescript: typeof ts,
    componentNode: ts.Node,
    propName: string,
    sourceFile: ts.SourceFile
): string | undefined {
    const fn = (
        typescript.isFunctionDeclaration(componentNode)
        || typescript.isFunctionExpression(componentNode)
        || typescript.isArrowFunction(componentNode)
    )
        ? componentNode
        : undefined;

    const param = fn?.parameters[0];

    if (!param || !typescript.isObjectBindingPattern(param.name)) {
        return undefined;
    }

    for (const element of param.name.elements) {
        if (!typescript.isBindingElement(element)) {
            continue;
        }

        let bindingPropName: string | undefined;

        if (element.propertyName && typescript.isIdentifier(element.propertyName)) {
            bindingPropName = element.propertyName.text;
        }
        else if (typescript.isIdentifier(element.name)) {
            bindingPropName = element.name.text;
        }

        if (bindingPropName !== propName || !element.initializer) {
            continue;
        }

        return element.initializer.getText(sourceFile);
    }

    return undefined;
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

    const allProperties = collectComponentProperties(typescript, propsType);
    const hasInterfaceHeritage = propsTypeHasInterfaceHeritage(typescript, propsType);
    const bulkExcluded = getBulkSourceExclusions(allProperties);
    const unionIfConditions = collectDiscriminatedUnionIfConditions(typescript, checker, propsType);
    const props: Record<string, SerializedProp> = {};

    for (const prop of allProperties) {
        if (!shouldIncludeComponentProp(prop, sourceFile, hasInterfaceHeritage, bulkExcluded)) {
            continue;
        }

        const propName = prop.getName();
        const unionPropType = resolveUnionPropType(typescript, checker, propsType, propName);
        const resolvedPropType = resolvePropDeclarationType(typescript, checker, prop, contextNode);
        const propType = unionPropType === undefined ? resolvedPropType : unionPropType;
        const unionOptional = isPropOptionalInUnion(typescript, propsType, propName);
        const isOptional = unionOptional ?? (
            !!(prop.flags & typescript.SymbolFlags.Optional)
            || !!(propType.flags & typescript.TypeFlags.Undefined)
        );
        const description = typescript.displayPartsToString(prop.getDocumentationComment(checker));
        const jsDocDefault = extractDefaultValueFromJsDoc(checker, prop);
        const destructuringDefault = extractDestructuringDefaultValue(
            typescript,
            contextNode,
            propName,
            sourceFile
        );
        const defaultValue = jsDocDefault ?? (
            destructuringDefault ? { value: destructuringDefault } : undefined
        );
        const conditionalIf = unionIfConditions.get(propName);

        props[propName] = {
            name: propName,
            ...(description ? { description } : {}),
            ...(defaultValue ? { defaultValue } : {}),
            ...(conditionalIf ? { if: conditionalIf } : {}),
            required: !isOptional,
            type: serializeType(typescript, checker, propType, !isOptional, propName),
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
    const jsDocTags = extractComponentJsDocTags(checker, resolved);

    return {
        displayName,
        exportName,
        filePath: componentRef.path ?? sourceFile.fileName,
        ...(description ? { description } : {}),
        ...(jsDocTags ? { jsDocTags } : {}),
        props,
    };
}
