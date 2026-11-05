import { convert, type DocgenInfo as StorybookDocgenInfo } from 'storybook/internal/docs-tools';

import type { SolidComponentDoc } from './types';
import type { StrictArgTypes, StrictInputType } from 'storybook/internal/types';

// Maps Solid component-meta output to Storybook docgen / argTypes shapes.
export interface DocgenInfo {
    displayName?: string;
    description?: string;
    props: Record<string, {
        name: string;
        description?: string;
        required?: boolean;
        if?: { arg: string; eq: string | number | boolean };
        type: {
            name: string;
            raw?: string;
            value?: unknown;
            computed?: boolean;
        };
        defaultValue?: { value: string } | null;
        parent?: { name: string; fileName: string };
    }>;
}

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

                if (prop.if !== undefined) {
                    entry.if = prop.if;
                }

                return [name, entry];
            })
        ),
    };
}

function toSbType(prop: SolidComponentDoc['props'][string]) {
    return convert({
        type: {
            name: prop.type.name,
            raw: prop.type.raw ?? prop.type.name,
            ...(prop.type.value !== undefined ? { value: prop.type.value } : {}),
        },
        required: prop.required,
        description: prop.description ?? '',
        defaultValue: prop.defaultValue ?? { value: '' },
    } satisfies StorybookDocgenInfo);
}

export function solidComponentDocToArgTypesData(doc: SolidComponentDoc): StrictArgTypes {
    return Object.fromEntries(
        Object.entries(doc.props).map(([name, prop]) => {
            const sbType = toSbType(prop);
            const argType: StrictInputType = {
                name,
                description: prop.description ?? '',
                type: sbType
                    ? { required: prop.required, ...sbType }
                    : { name: 'other', value: prop.type.name, required: prop.required },
                table: {
                    type: { summary: prop.type.raw ?? prop.type.name },
                    ...(prop.defaultValue
                        ? { defaultValue: { summary: prop.defaultValue.value } }
                        : {}),
                },
            };

            if (prop.if) {
                argType.if = prop.if;
            }

            return [name, argType];
        })
    );
}
