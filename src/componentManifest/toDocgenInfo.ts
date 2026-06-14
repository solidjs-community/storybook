import type { SolidComponentDoc } from './types';

/** Maps Solid component-meta (RCM) output to the `__docgenInfo` shape consumed by `storybook/internal/docs-tools`. */
export type DocgenInfo = {
    displayName?: string;
    description?: string;
    props: Record<string, {
        name: string;
        description?: string;
        required?: boolean;
        type: { name: string; raw?: string };
        defaultValue?: { value: string } | null;
        parent?: { name: string; fileName: string };
    }>;
};

export function solidComponentDocToDocgenInfo(doc: SolidComponentDoc): DocgenInfo {
    return {
        ...(doc.displayName !== undefined ? { displayName: doc.displayName } : {}),
        ...(doc.description !== undefined ? { description: doc.description } : {}),
        props: Object.fromEntries(
            Object.entries(doc.props).map(([name, prop]) => {
                const entry: DocgenInfo['props'][string] = {
                    name: prop.name,
                    required: prop.required,
                    type: {
                        name: prop.type.name,
                        raw: prop.type.raw ?? prop.type.name,
                    },
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
