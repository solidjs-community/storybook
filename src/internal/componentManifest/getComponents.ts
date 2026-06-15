import { dirname, resolve } from 'node:path';
import { types as t } from 'storybook/internal/babel';

import type { ComponentRef } from './types';

type CsfProgram = {
    traverse: (visitors: Record<string, unknown>) => void;
    get: (key: string) => Array<{ isImportDeclaration: () => boolean; node: t.ImportDeclaration }>;
    scope: { getBinding: (name: string) => { path: { isImportSpecifier?: () => boolean; isImportDefaultSpecifier?: () => boolean; isImportNamespaceSpecifier?: () => boolean } } | undefined };
};

function importedName(specifier: t.ImportSpecifier) {
    if (t.isIdentifier(specifier.imported)) {
        return specifier.imported.name;
    }

    return specifier.imported.value;
}

function isTypeSpecifier(specifier: t.Node) {
    return t.isImportSpecifier(specifier) && specifier.importKind === 'type';
}

function baseIdentifier(component: string) {
    return component.split('.')[0] ?? component;
}

export async function getComponents({
    csf,
    storyFilePath,
    additionalComponentNames = [],
}: {
    csf: { _meta?: { component?: string }; _file: { path: CsfProgram } };
    storyFilePath: string;
    additionalComponentNames?: string[];
}): Promise<ComponentRef[]> {
    const program = csf._file.path;
    const componentSet = new Set<string>();
    const componentDepth = new Map<string, number>();
    const localToImport = new Map<string, { importId: string; importName: string }>();
    let jsxDepth = 0;

    program.traverse({
        JSXElement: {
            enter() {
                jsxDepth++;
            },
            exit() {
                jsxDepth--;
            },
        },
        JSXOpeningElement(path: { node: t.JSXOpeningElement }) {
            const n = path.node.name;
            let name: string | undefined;

            if (t.isJSXIdentifier(n)) {
                name = n.name;

                if (name && /[A-Z]/.test(name.charAt(0))) {
                    componentSet.add(name);
                }
            }
            else if (t.isJSXMemberExpression(n)) {
                const jsxNameToString = (nm: t.JSXMemberExpression | t.JSXIdentifier): string => (
                    t.isJSXIdentifier(nm)
                        ? nm.name
                        : `${ jsxNameToString(nm.object) }.${ jsxNameToString(nm.property) }`
                );

                name = jsxNameToString(n);
                componentSet.add(name);
            }

            if (name) {
                const depth = jsxDepth - 1;
                const existing = componentDepth.get(name);

                if (existing === undefined || depth < existing) {
                    componentDepth.set(name, depth);
                }
            }
        },
    });

    const metaComp = csf._meta?.component;

    if (metaComp) {
        componentSet.add(metaComp);
    }

    for (const componentName of additionalComponentNames) {
        componentSet.add(componentName);
    }

    const components = Array.from(componentSet).sort((a, b) => a.localeCompare(b));
    const body = program.get('body');

    for (const stmt of body) {
        if (!stmt.isImportDeclaration()) {
            continue;
        }

        const decl = stmt.node;

        if (decl.importKind === 'type') {
            continue;
        }

        for (const specifier of decl.specifiers ?? []) {
            if (!('local' in specifier) || !specifier.local || isTypeSpecifier(specifier)) {
                continue;
            }

            const importId = decl.source.value;

            if (t.isImportDefaultSpecifier(specifier)) {
                localToImport.set(specifier.local.name, { importId, importName: 'default' });
            }
            else if (t.isImportNamespaceSpecifier(specifier)) {
                localToImport.set(specifier.local.name, { importId, importName: '*' });
            }
            else if (t.isImportSpecifier(specifier)) {
                localToImport.set(specifier.local.name, {
                    importId,
                    importName: importedName(specifier),
                });
            }
        }
    }

    const isLocallyDefinedWithoutImport = (base: string) => {
        const binding = program.scope.getBinding(base);

        return binding
            ? !(binding.path.isImportSpecifier?.()
              || binding.path.isImportDefaultSpecifier?.()
              || binding.path.isImportNamespaceSpecifier?.())
            : false;
    };

    const filteredComponents = components.filter(c => !isLocallyDefinedWithoutImport(baseIdentifier(c)));

    return Promise.all(
        filteredComponents.map(async(c) => {
            const depth = componentDepth.get(c);
            const jsxDepthFields = depth !== undefined ? { jsxDepth: depth } as const : {};
            const dot = c.indexOf('.');
            let component: ComponentRef;

            if (dot !== -1) {
                const ns = c.slice(0, dot);
                const mem = c.slice(dot + 1);
                const direct = localToImport.get(ns);

                component = direct
                    ? direct.importName === '*'
                        ? {
                            componentName: c,
                            localImportName: ns,
                            importId: direct.importId,
                            importName: mem,
                            namespace: ns,
                            member: mem,
                            ...jsxDepthFields,
                        }
                        : {
                            componentName: c,
                            localImportName: ns,
                            importId: direct.importId,
                            importName: direct.importName,
                            member: mem,
                            ...jsxDepthFields,
                        }
                    : { componentName: c, member: mem, ...jsxDepthFields };
            }
            else {
                const direct = localToImport.get(c);

                component = direct
                    ? {
                        componentName: c,
                        localImportName: c,
                        importId: direct.importId,
                        importName: direct.importName,
                        ...jsxDepthFields,
                    }
                    : { componentName: c, ...jsxDepthFields };
            }

            if (component.importId && !component.importId.startsWith('.')) {
                return { ...component, isPackage: true };
            }

            if (component.importId) {
                const resolved = resolve(
                    dirname(storyFilePath),
                    component.importId.replace(/\.tsx?$/, '')
                );
                const candidates = [`${ resolved }.tsx`, `${ resolved }.ts`, `${ resolved }.jsx`, `${ resolved }.js`];
                let componentPath: string | undefined;

                for (const candidate of candidates) {
                    try {
                        const { accessSync } = await import('node:fs');

                        accessSync(candidate);
                        componentPath = candidate;
                        break;
                    }
                    catch {
                        // try next extension
                    }
                }

                if (componentPath) {
                    return { ...component, path: componentPath };
                }
            }

            return component;
        })
    );
}

export function findMatchingComponent(
    components: ComponentRef[],
    componentName: string | undefined,
    title: string
) {
    if (!componentName) {
        return undefined;
    }

    const exact = components.find(
        c => c.componentName === componentName
          || c.localImportName === componentName
          || c.importName === componentName
    );

    if (exact) {
        return exact;
    }

    const trimmedTitle = title.replace(/\s+/g, '');
    const matches = components.filter(
        it => trimmedTitle.includes(it.componentName)
          || (it.localImportName && trimmedTitle.includes(it.localImportName))
          || (it.importName && trimmedTitle.includes(it.importName))
    );

    if (matches.length <= 1) {
        return matches[0];
    }

    let best = matches[0]!;

    for (const cur of matches) {
        if (cur.jsxDepth === 0) {
            return cur;
        }

        if ((cur.jsxDepth ?? Infinity) < (best.jsxDepth ?? Infinity)) {
            best = cur;
        }
    }

    return best;
}

export function findExactComponentMatch(components: ComponentRef[], componentName: string) {
    return components.find(
        c => c.componentName === componentName
          || c.localImportName === componentName
          || c.importName === componentName
    );
}
