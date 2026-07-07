import {
    asExtendedChecker,
    filterDiscriminatedUnionMembers,
    getLiteralTypesFromPropType,
    literalTypeToDocgenValue,
    MAX_SERIALIZATION_DEPTH,
} from './typeUtils';

import type ts from 'typescript';
import type { SerializedProp, SerializedPropIf } from '../types';

function pickDiscriminantKey(discriminants: string[], propName?: string) {
    if (discriminants.length === 1) {
        return discriminants[0];
    }

    if (propName && discriminants.includes(propName)) {
        return propName;
    }

    return undefined;
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

export function getDiscriminantKeys(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    members: ts.Type[]
) {
    const firstMember = members[0];

    if (!firstMember) {
        return [];
    }

    return firstMember.getProperties()
        .map(prop => prop.getName())
        .filter(key => members.every((member) => {
            const prop = member.getProperty(key);

            if (!prop) {
                return false;
            }

            const propType = checker.getTypeOfSymbol(prop);

            return getLiteralTypesFromPropType(typescript, propType).length > 0;
        }));
}

function resolveUnionObjectMembers(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type,
    depth: number
): ts.Type[] | undefined {
    if (depth > MAX_SERIALIZATION_DEPTH) {
        return undefined;
    }

    if (type.isUnion()) {
        const members = filterDiscriminatedUnionMembers(typescript, type.types);

        if (members.length >= 2) {
            return members;
        }

        return undefined;
    }

    if (type.aliasSymbol) {
        const aliasDeclaration = type.aliasSymbol.getDeclarations()?.[0];

        if (aliasDeclaration && typescript.isTypeAliasDeclaration(aliasDeclaration)) {
            return resolveUnionObjectMembers(
                typescript,
                checker,
                checker.getTypeFromTypeNode(aliasDeclaration.type),
                depth + 1
            );
        }
    }

    return undefined;
}

function serializeDiscriminatedUnionEnum(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    members: ts.Type[],
    discriminantKey: string
): SerializedProp['type'] | undefined {
    const isSingleFieldTaggedUnion = members.every((member) => {
        const properties = member.getProperties();

        return properties.length === 1 && properties[0]?.getName() === discriminantKey;
    });

    if (!isSingleFieldTaggedUnion) {
        return undefined;
    }

    const literals: ts.Type[] = [];
    const seen = new Set<string>();

    for (const member of members) {
        const prop = member.getProperty(discriminantKey);

        if (!prop) {
            return undefined;
        }

        const memberLiterals = getLiteralTypesFromPropType(
            typescript,
            checker.getTypeOfSymbol(prop)
        );

        if (memberLiterals.length !== 1) {
            return undefined;
        }

        const literal = memberLiterals[0];

        if (!literal) {
            return undefined;
        }

        const literalKey = checker.typeToString(literal);

        if (seen.has(literalKey)) {
            continue;
        }

        seen.add(literalKey);
        literals.push(literal);
    }

    if (literals.length < 2) {
        return undefined;
    }

    return serializeEnumFromLiteralTypes(checker, literals);
}

export function trySerializeDiscriminatedUnionEnumFromMembers(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    members: ts.Type[],
    propName?: string
): SerializedProp['type'] | undefined {
    const discriminantKey = pickDiscriminantKey(
        getDiscriminantKeys(typescript, checker, members),
        propName
    );

    if (!discriminantKey) {
        return undefined;
    }

    return serializeDiscriminatedUnionEnum(typescript, checker, members, discriminantKey);
}

export function trySerializeDiscriminatedUnion(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    type: ts.Type,
    propName: string | undefined,
    depth: number
): SerializedProp['type'] | undefined {
    const members = resolveUnionObjectMembers(typescript, checker, type, depth);

    if (!members) {
        return undefined;
    }

    return trySerializeDiscriminatedUnionEnumFromMembers(typescript, checker, members, propName);
}

function literalTypeToConditionalEq(checker: ts.TypeChecker, type: ts.Type) {
    if (type.isStringLiteral()) {
        return type.value;
    }

    if (type.isNumberLiteral()) {
        return type.value;
    }

    if (checker.typeToString(type) === 'true') {
        return true;
    }

    if (checker.typeToString(type) === 'false') {
        return false;
    }

    return undefined;
}

export function collectDiscriminatedUnionIfConditions(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    propsType: ts.Type
): Map<string, SerializedPropIf> {
    if (!propsType.isUnion()) {
        return new Map();
    }

    const members = filterDiscriminatedUnionMembers(typescript, propsType.types);

    if (members.length < 2) {
        return new Map();
    }

    const discriminants = getDiscriminantKeys(typescript, checker, members);

    if (discriminants.length !== 1) {
        return new Map();
    }

    const discriminantKey = discriminants[0]!;

    if (!discriminantKey) {
        return new Map();
    }

    const propNames = new Set<string>();

    for (const member of members) {
        for (const memberProp of member.getProperties()) {
            propNames.add(memberProp.getName());
        }
    }

    const conditions = new Map<string, SerializedPropIf>();

    for (const propName of propNames) {
        if (propName === discriminantKey) {
            continue;
        }

        const branchesWithProp = members.filter(member => member.getProperty(propName));

        if (branchesWithProp.length !== 1) {
            continue;
        }

        const branch = branchesWithProp[0]!;

        const discriminantProp = branch.getProperty(discriminantKey);

        if (!discriminantProp) {
            continue;
        }

        const discriminantLiterals = getLiteralTypesFromPropType(
            typescript,
            checker.getTypeOfSymbol(discriminantProp)
        );

        if (discriminantLiterals.length !== 1) {
            continue;
        }

        const eq = literalTypeToConditionalEq(checker, discriminantLiterals[0]!);

        if (eq === undefined) {
            continue;
        }

        conditions.set(propName, { arg: discriminantKey, eq });
    }

    return conditions;
}

export function collectComponentProperties(
    typescript: typeof ts,
    propsType: ts.Type
): ts.Symbol[] {
    if (!propsType.isUnion()) {
        return propsType.getApparentProperties();
    }

    const members = filterDiscriminatedUnionMembers(typescript, propsType.types);

    if (members.length < 2) {
        return propsType.getApparentProperties();
    }

    const propsByName = new Map<string, ts.Symbol>();

    for (const member of members) {
        for (const prop of member.getProperties()) {
            if (!propsByName.has(prop.getName())) {
                propsByName.set(prop.getName(), prop);
            }
        }
    }

    return [...propsByName.values()];
}

export function resolveUnionPropType(
    typescript: typeof ts,
    checker: ts.TypeChecker,
    propsType: ts.Type,
    propName: string
): ts.Type | undefined {
    if (!propsType.isUnion()) {
        return undefined;
    }

    const members = filterDiscriminatedUnionMembers(typescript, propsType.types);

    if (members.length < 2) {
        return undefined;
    }

    const propTypes = members.flatMap((member) => {
        const prop = member.getProperty(propName);

        return prop ? [checker.getTypeOfSymbol(prop)] : [];
    });

    if (propTypes.length === 0) {
        return undefined;
    }

    if (propTypes.length === 1) {
        return propTypes[0];
    }

    return asExtendedChecker(checker).getUnionType(propTypes);
}

export function isPropOptionalInUnion(
    typescript: typeof ts,
    propsType: ts.Type,
    propName: string
): boolean | undefined {
    if (!propsType.isUnion()) {
        return undefined;
    }

    const members = filterDiscriminatedUnionMembers(typescript, propsType.types);

    if (members.length < 2) {
        return undefined;
    }

    return members.some((member) => {
        const branchProp = member.getProperty(propName);

        if (!branchProp) {
            return true;
        }

        return !!(branchProp.flags & typescript.SymbolFlags.Optional);
    });
}
