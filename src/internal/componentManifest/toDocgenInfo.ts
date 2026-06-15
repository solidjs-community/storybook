import type { SolidComponentDoc } from './types';

/** Maps Solid component-meta (RCM) output to the `__docgenInfo` shape consumed by `storybook/internal/docs-tools`. */
export type DocgenInfo = {
    displayName?: string;
    description?: string;
    props: Record<string, {
        name: string;
        description?: string;
        required?: boolean;
        type: {
            name: string;
            raw?: string;
            value?: unknown;
            computed?: boolean;
        };
        defaultValue?: { value: string } | null;
        parent?: { name: string; fileName: string };
    }>;
};

function serializeDocgenPropType(type: SolidComponentDoc['props'][string]['type']) {
    const docgenType: DocgenInfo['props'][string]['type'] = {
        name: type.name,
        raw: type.raw ?? type.name,
    };

    if (type.value != null) {
        docgenType.value = type.value;
    }

    return docgenType;
}

export function solidComponentDocToDocgenInfo(doc: SolidComponentDoc): DocgenInfo {
    return {
        ...(doc.displayName !== undefined ? { displayName: doc.displayName } : {}),
        ...(doc.description !== undefined ? { description: doc.description } : {}),
        props: Object.fromEntries(
            Object.entries(doc.props).map(([name, prop]) => {
                const entry: DocgenInfo['props'][string] = {
                    name: prop.name,
                    required: prop.required,
                    type: serializeDocgenPropType(prop.type),
                    defaultValue: prop.defaultValue ?? null,
                };

                if (prop.description !== undefined) {
                    entry.description = prop.description;
                }

                return [name, entry];
            })
        ),
    };
}

export function solidComponentDocToArgTypesData(doc: SolidComponentDoc): Record<string, unknown> {
    const docgenInfo = solidComponentDocToDocgenInfo(doc);

    return Object.fromEntries(
        Object.entries(docgenInfo.props).map(([name, prop]) => [
            name,
            {
                name,
                type: prop.type.name,
                required: prop.required ?? false,
                description: prop.description,
            },
        ])
    );
}
