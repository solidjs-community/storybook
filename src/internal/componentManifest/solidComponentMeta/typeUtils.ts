import type ts from '@typescript/typescript6';

export const MAX_UNWRAP_DEPTH = 5;
export const MAX_SERIALIZATION_DEPTH = 5;
export const SOLID_COMPONENT_TYPE_ALIASES = /^(?:Component|VoidComponent|ParentComponent|FlowComponent)$/;

export type ExtendedTypeChecker = ts.TypeChecker & {
    getUnionType: (types: readonly ts.Type[]) => ts.Type;
    getTypeOfPropertyOfType: (type: ts.Type, propertyName: string) => ts.Type | undefined;
    getNumberLiteralType: (value: number) => ts.Type;
};

export function asExtendedChecker(checker: ts.TypeChecker) {
    return checker as ExtendedTypeChecker;
}

export function resolveAliasedSymbol(typescript: typeof ts, checker: ts.TypeChecker, symbol: ts.Symbol) {
    return symbol.flags & typescript.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

export function isNullishType(typescript: typeof ts, type: ts.Type) {
    const flags = type.getFlags();

    return !!(flags & typescript.TypeFlags.Undefined) || !!(flags & typescript.TypeFlags.Null);
}

export function isLiteralType(type: ts.Type) {
    return type.isStringLiteral() || type.isNumberLiteral();
}

export function isBooleanLiteralType(typescript: typeof ts, type: ts.Type) {
    return !!(type.getFlags() & typescript.TypeFlags.BooleanLiteral);
}

export function isObjectLikeType(typescript: typeof ts, type: ts.Type) {
    return !!(type.flags & typescript.TypeFlags.Object)
        && !isLiteralType(type)
        && !isBooleanLiteralType(typescript, type);
}

export function filterDiscriminatedUnionMembers(typescript: typeof ts, types: readonly ts.Type[]) {
    return types.filter(
        member => !isNullishType(typescript, member) && isObjectLikeType(typescript, member)
    );
}

export function getLiteralTypesFromPropType(typescript: typeof ts, type: ts.Type) {
    if (isLiteralType(type)) {
        return [type];
    }

    if (type.isUnion()) {
        return type.types.filter(
            member => !isNullishType(typescript, member) && isLiteralType(member)
        );
    }

    return [];
}

export function literalTypeToDocgenValue(type: ts.Type) {
    if (type.isStringLiteral()) {
        return JSON.stringify(type.value);
    }

    if (type.isNumberLiteral()) {
        return JSON.stringify(type.value);
    }

    return JSON.stringify(type);
}
