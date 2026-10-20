import {
    trySerializeDiscriminatedUnion,
    trySerializeDiscriminatedUnionEnumFromMembers,
} from './discriminatedUnion';
import {
    asExtendedChecker,
    isBooleanLiteralType,
    isLiteralType,
    isNullishType,
    literalTypeToDocgenValue,
    MAX_SERIALIZATION_DEPTH,
} from './typeUtils';

import type ts from '@typescript/typescript6';
import type { SerializedProp } from '../types';

function parseStringLiteralToken(token: string) {
    if (
        (token.startsWith('"') && token.endsWith('"'))
        || (token.startsWith('\'') && token.endsWith('\''))
    ) {
        try {
            return JSON.parse(token.replace(/^'/, '"').replace(/'$/, '"')) as string;
        }
        catch {
            return token.slice(1, -1);
        }
    }

    return undefined;
}

function tryParseStringUnion(typeName: string): SerializedProp['type'] | undefined {
    if (!typeName.includes('|')) {
        return undefined;
    }

    const parts = typeName
        .split('|')
        .map(part => part.trim())
        .filter(part => part !== 'undefined' && part !== 'null');
    const stringLiterals = parts
        .map(parseStringLiteralToken)
        .filter((value): value is string => value != null);

    if (stringLiterals.length === 0 || stringLiterals.length !== parts.length) {
        return undefined;
    }

    return {
        name: 'enum',
        raw: typeName,
        value: stringLiterals.map(value => ({ value: JSON.stringify(value) })),
    };
}

function resolveKeyofTypeofConstArray(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    declaration: ts.PropertySignature
): ts.Type | undefined {
    const typeNode = declaration.type;

    if (
        !typeNode
        || !typescript.isTypeOperatorNode(typeNode)
        || typeNode.operator !== typescript.SyntaxKind.KeyOfKeyword
    ) {
        return undefined;
    }

    const operand = typeNode.type;

    if (!operand || !typescript.isTypeQueryNode(operand)) {
        return undefined;
    }

    const typeQuery = operand as ts.TypeQueryNode & { expr?: ts.EntityName };
    const queryName = typeQuery.exprName ?? typeQuery.expr;

    let identifier: ts.Identifier | undefined;

    if (queryName && typescript.isIdentifier(queryName)) {
        identifier = queryName;
    }
    else if (queryName && typescript.isQualifiedName(queryName)) {
        identifier = queryName.right;
    }

    if (!identifier || !typescript.isIdentifier(identifier)) {
        return undefined;
    }

    const constSymbol = checker.getSymbolAtLocation(identifier);

    if (
        !constSymbol?.valueDeclaration
        || !typescript.isVariableDeclaration(constSymbol.valueDeclaration)
    ) {
        return undefined;
    }

    const initializer = constSymbol.valueDeclaration.initializer;

    if (
        !initializer
        || !typescript.isAsExpression(initializer)
        || !typescript.isArrayLiteralExpression(initializer.expression)
    ) {
        return undefined;
    }

    const { elements } = initializer.expression;

    if (elements.length === 0) {
        return undefined;
    }

    const indexTypes = elements.map((_, index) => asExtendedChecker(checker).getNumberLiteralType(index));

    return asExtendedChecker(checker).getUnionType(indexTypes);
}

function isEmptyStringLiteral(type: ts.Type) {
    return type.isStringLiteral() && type.value === '';
}

function isFalseBooleanLiteral(checker: ts.TypeChecker, type: ts.Type, typescript: typeof ts) {
    return isBooleanLiteralType(typescript, type) && checker.typeToString(type) === 'false';
}

function isTrueBooleanLiteral(checker: ts.TypeChecker, type: ts.Type, typescript: typeof ts) {
    return isBooleanLiteralType(typescript, type) && checker.typeToString(type) === 'true';
}

function isBooleanishType(typescript: typeof ts, type: ts.Type) {
    return isBooleanLiteralType(typescript, type)
        || !!(type.getFlags() & typescript.TypeFlags.Boolean)
        || isEmptyStringLiteral(type);
}

const SOLID_JSX_ATTRIBUTE_HELPER_NAMES = new Set([
    'BooleanAttribute',
    'BooleanProperty',
    'EnumeratedAcceptsEmpty',
    'EnumeratedPseudoBoolean',
    'RemoveAttribute',
    'RemoveProperty',
]);

function isSolidJsxAttributeHelperName(name: string | undefined) {
    return name != null && SOLID_JSX_ATTRIBUTE_HELPER_NAMES.has(name);
}

function isSolidJsxAttributeUnion(checker: ts.TypeChecker, type: ts.UnionType) {
    if (SOLID_JSX_ATTRIBUTE_HELPER_NAMES.has(type.aliasSymbol?.getName() ?? '')) {
        return true;
    }

    if ([...SOLID_JSX_ATTRIBUTE_HELPER_NAMES].some(name => checker.typeToString(type).includes(name))) {
        return true;
    }

    return type.types.some(member => isSolidJsxAttributeHelperName(member.aliasSymbol?.getName()));
}

function isSolidJsxRemoveAttributeAlias(type: ts.Type) {
    const name = type.aliasSymbol?.getName();

    return name === 'RemoveAttribute' || name === 'RemoveProperty';
}

// Solid JSX uses `RemoveAttribute` (`undefined | false`) to omit an attr, not as a value.
function stripSolidJsxAttributeSentinels(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    members: readonly ts.Type[]
) {
    let remaining = members.filter(member =>
        !isNullishType(typescript, member) && !isSolidJsxRemoveAttributeAlias(member)
    );

    const hasConcrete = remaining.some(member =>
        !isBooleanLiteralType(typescript, member) && !isEmptyStringLiteral(member)
    );

    if (hasConcrete) {
        remaining = remaining.filter(member => !isFalseBooleanLiteral(checker, member, typescript));
    }

    const hasNamedLiterals = remaining.some(member =>
        (member.isStringLiteral() && member.value !== '')
        || member.isNumberLiteral()
    );

    if (hasNamedLiterals) {
        remaining = remaining.filter(member =>
            !isTrueBooleanLiteral(checker, member, typescript) && !isEmptyStringLiteral(member)
        );
    }

    return remaining;
}

function isStringAndNumberUnion(typescript: typeof ts, members: readonly ts.Type[]) {
    if (members.length !== 2) {
        return false;
    }

    const flags = members.map(member => member.getFlags());

    return flags.some(flag => flag & typescript.TypeFlags.String)
        && flags.some(flag => flag & typescript.TypeFlags.Number);
}

function unwrapUtilityTypeAlias(type: ts.Type): ts.Type | undefined {
    const aliasName = type.aliasSymbol?.getName();

    if (
        (aliasName === 'Readonly' || aliasName === 'Partial')
        && type.aliasTypeArguments?.length === 1
    ) {
        return type.aliasTypeArguments[0];
    }

    return undefined;
}

function isAutocompleteStringUnion(typescript: typeof ts, type: ts.UnionType) {
    const members = type.types.filter(member => !isNullishType(typescript, member));
    const stringLiterals = members.filter(member => member.isStringLiteral());

    if (stringLiterals.length === 0) {
        return false;
    }

    const hasStringWidening = members.some((member) => {
        if (member.getFlags() & typescript.TypeFlags.String) {
            return true;
        }

        if (!member.isIntersection?.()) {
            return false;
        }

        return member.types.some(
            intersectionMember => !!(intersectionMember.getFlags() & typescript.TypeFlags.String)
        );
    });

    if (!hasStringWidening) {
        return false;
    }

    return members.every((member) => {
        if (member.isStringLiteral()) {
            return true;
        }

        if (member.getFlags() & typescript.TypeFlags.String) {
            return true;
        }

        if (!member.isIntersection?.()) {
            return false;
        }

        const intersectionMembers = member.types;

        return intersectionMembers.some(
            intersectionMember => !!(intersectionMember.getFlags() & typescript.TypeFlags.String)
        ) && intersectionMembers.some(
            intersectionMember => !!(intersectionMember.getFlags() & typescript.TypeFlags.Object)
        );
    });
}

function serializeObjectFromApparentProperties(
    checker: ts.TypeChecker,
    type: ts.Type
): SerializedProp['type'] {
    const entries = type.getApparentProperties()
        .map(prop => `${ prop.getName() }: ${ checker.typeToString(checker.getTypeOfSymbol(prop)) }`)
        .sort();

    const name = `{ ${ entries.join('; ') }; }`;

    return { name, raw: name };
}

const EXPANDABLE_UTILITY_ALIASES = new Set(['Pick', 'Omit', 'Required']);

function shouldSerializeFromApparentProperties(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type
) {
    const properties = type.getApparentProperties();

    if (properties.length === 0) {
        return false;
    }

    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
        return false;
    }

    const utilityName = type.aliasSymbol?.getName();

    if (utilityName && EXPANDABLE_UTILITY_ALIASES.has(utilityName)) {
        return true;
    }

    if (!(type.flags & typescript.TypeFlags.Object) || type.isUnion?.()) {
        return false;
    }

    if (!type.aliasSymbol) {
        return false;
    }

    const printed = checker.typeToString(type);

    return printed === type.aliasSymbol.getName();
}

function isObjectTypeLiteral(typescript: typeof ts, type: ts.Type) {
    if (!(type.flags & typescript.TypeFlags.Object)) {
        return false;
    }

    if (type.getCallSignatures().length > 0 || type.getConstructSignatures().length > 0) {
        return false;
    }

    return type.getProperties().length > 0;
}

function isMergeableObjectIntersection(typescript: typeof ts, type: ts.Type) {
    if (!type.isIntersection?.()) {
        return false;
    }

    const members = type.types.filter(member => !isNullishType(typescript, member));

    if (members.length < 2) {
        return false;
    }

    return members.every(member => isObjectTypeLiteral(typescript, member));
}

function serializeEnumFromLiteralTypes(
    checker: ts.TypeChecker,
    literals: ts.Type[]
): SerializedProp['type'] {
    return {
        name: 'enum',
        raw: literals.map(literal => checker.typeToString(literal)).join(' | '),
        value: literals.map(literal => ({
            value: literalTypeToDocgenValue(literal),
        })),
    };
}

function getStringLiteralIndexKey(typescript: typeof ts, indexType: ts.TypeNode) {
    if (typescript.isLiteralTypeNode(indexType) && typescript.isStringLiteral(indexType.literal)) {
        return indexType.literal.text;
    }

    return undefined;
}

function isSimpleResolvedType(typescript: typeof ts, type: ts.Type) {
    if (type.isStringLiteral() || type.isNumberLiteral() || isBooleanLiteralType(typescript, type)) {
        return true;
    }

    if (type.isUnion()) {
        const nonNullishTypes = type.types.filter(member => !isNullishType(typescript, member));

        if (nonNullishTypes.length === 0) {
            return false;
        }

        if (nonNullishTypes.every(isLiteralType) || nonNullishTypes.every(member => isBooleanLiteralType(typescript, member))) {
            return true;
        }

        return nonNullishTypes.every((member) => {
            const flags = member.getFlags();

            return !!(
                flags & typescript.TypeFlags.String
                || flags & typescript.TypeFlags.Number
                || flags & typescript.TypeFlags.Boolean
            );
        });
    }

    const flags = type.getFlags();

    return !!(
        flags & typescript.TypeFlags.String
        || flags & typescript.TypeFlags.Number
        || flags & typescript.TypeFlags.Boolean
    );
}

function resolveIndexedAccessPropertyType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    node: ts.IndexedAccessTypeNode,
    contextNode: ts.Node
) {
    const indexKey = getStringLiteralIndexKey(typescript, node.indexType);

    if (!indexKey) {
        return undefined;
    }

    const objectType = checker.getTypeFromTypeNode(node.objectType);
    const propertyType = asExtendedChecker(checker).getTypeOfPropertyOfType(objectType, indexKey);

    if (propertyType && isSimpleResolvedType(typescript, propertyType)) {
        return propertyType;
    }

    const property = objectType.getProperty(indexKey) ?? checker.getPropertyOfType(objectType, indexKey);

    if (!property) {
        return undefined;
    }

    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const context = declaration ?? contextNode;

    return checker.getTypeOfSymbolAtLocation(property, context);
}

export function resolvePropDeclarationType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    prop: ts.Symbol,
    contextNode: ts.Node
) {
    const propType = checker.getTypeOfSymbolAtLocation(prop, contextNode);
    const declaration = prop.valueDeclaration;

    if (declaration && typescript.isPropertySignature(declaration)) {
        const keyofTuple = resolveKeyofTypeofConstArray(typescript, checker, declaration);

        if (keyofTuple) {
            return keyofTuple;
        }
    }

    if (!declaration || !typescript.isPropertySignature(declaration) || !declaration.type) {
        return propType;
    }

    if (!typescript.isIndexedAccessTypeNode(declaration.type)) {
        return propType;
    }

    const nodeType = checker.getTypeFromTypeNode(declaration.type);

    if (isSimpleResolvedType(typescript, nodeType)) {
        return nodeType;
    }

    const resolved = resolveIndexedAccessPropertyType(
        typescript,
        checker,
        declaration.type,
        contextNode
    );

    if (!resolved || !isSimpleResolvedType(typescript, resolved)) {
        return propType;
    }

    const currentName = checker.typeToString(propType);
    const resolvedName = checker.typeToString(resolved);

    if (currentName !== resolvedName) {
        return resolved;
    }

    return propType;
}

export function serializeType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type,
    isRequired: boolean,
    propName?: string,
    depth = 0
): SerializedProp['type'] {
    if (depth > MAX_SERIALIZATION_DEPTH) {
        return { name: checker.typeToString(type) };
    }

    const readonlyInner = unwrapUtilityTypeAlias(type);

    if (readonlyInner) {
        return serializeType(typescript, checker, readonlyInner, isRequired, propName, depth + 1);
    }

    if (type.isIntersection?.() && isMergeableObjectIntersection(typescript, type)) {
        return serializeObjectFromApparentProperties(checker, type);
    }

    if (shouldSerializeFromApparentProperties(typescript, checker, type)) {
        return serializeObjectFromApparentProperties(checker, type);
    }

    if (type.isUnion()) {
        if (isAutocompleteStringUnion(typescript, type)) {
            return { name: 'string', raw: checker.typeToString(type) };
        }

        const members = isSolidJsxAttributeUnion(checker, type)
            ? stripSolidJsxAttributeSentinels(typescript, checker, type.types)
            : type.types.filter(member => !isNullishType(typescript, member));
        const raw = checker.typeToString(type);

        if (members.length === 0) {
            return { name: 'boolean', raw };
        }

        if (members.every(member => isBooleanishType(typescript, member))) {
            return { name: 'boolean', raw };
        }

        if (members.length === 1) {
            const soleType = members[0];

            if (soleType) {
                return serializeType(typescript, checker, soleType, isRequired, propName, depth + 1);
            }
        }

        const literalMembers = members.filter(isLiteralType);

        if (literalMembers.length > 0 && literalMembers.length === members.length) {
            return serializeEnumFromLiteralTypes(checker, literalMembers);
        }

        if (isStringAndNumberUnion(typescript, members)) {
            return { name: 'string', raw };
        }

        if (members.length >= 2) {
            const discriminated = trySerializeDiscriminatedUnionEnumFromMembers(
                typescript,
                checker,
                members,
                propName
            );

            if (discriminated) {
                return discriminated;
            }
        }
    }

    if (!type.isUnion()) {
        const discriminatedUnion = trySerializeDiscriminatedUnion(
            typescript,
            checker,
            type,
            propName,
            depth
        );

        if (discriminatedUnion) {
            return discriminatedUnion;
        }
    }

    if (checker.isArrayType(type)) {
        return { name: 'array', raw: checker.typeToString(type) };
    }

    if (type.isStringLiteral()) {
        return {
            name: 'enum',
            raw: checker.typeToString(type),
            value: [{ value: literalTypeToDocgenValue(type) }],
        };
    }

    if (type.isNumberLiteral()) {
        return { name: 'number', raw: checker.typeToString(type) };
    }

    const primitiveFlags = type.getFlags();

    if (primitiveFlags & typescript.TypeFlags.String) {
        return { name: 'string', raw: checker.typeToString(type) };
    }

    if (primitiveFlags & typescript.TypeFlags.Number) {
        return { name: 'number', raw: checker.typeToString(type) };
    }

    if (primitiveFlags & typescript.TypeFlags.Boolean) {
        return { name: 'boolean', raw: checker.typeToString(type) };
    }

    const constraint = type.getConstraint?.();

    if (constraint && constraint !== type) {
        return serializeType(typescript, checker, constraint, isRequired, propName, depth + 1);
    }

    const typeName = checker.typeToString(type);
    const parsedUnion = tryParseStringUnion(typeName);

    if (parsedUnion) {
        return parsedUnion;
    }

    return { name: typeName, raw: typeName };
}
