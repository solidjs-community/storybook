import { accessSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { collectImportBindings, walk } from 'storybook/internal/csf-tools';

import type { ComponentRef } from './types';
import type { CsfFile, ESTree, ESTreeNode } from 'storybook/internal/csf-tools';

function baseIdentifier(component: string) {
    return component.split('.')[0] ?? component;
}

const MODULE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'] as const;

function findExistingModulePath(candidates: string[]) {
    for (const candidate of candidates) {
        try {
            accessSync(candidate);

            return candidate;
        }
        catch {
            // try next extension
        }
    }

    return undefined;
}

function modulePathCandidates(basePath: string) {
    return MODULE_EXTENSIONS.map(extension => `${ basePath }${ extension }`);
}

/** Resolve `./Button` style imports next to the story file. */
export function resolveRelativeComponentPath(storyFilePath: string, importId: string) {
    const resolved = resolve(
        dirname(storyFilePath),
        importId.replace(/\.tsx?$/, '')
    );

    return findExistingModulePath(modulePathCandidates(resolved));
}

/** Resolve `@design-system/button` style imports from the nearest node_modules. */
export function resolvePackageComponentPath(storyFilePath: string, importId: string) {
    let dir = dirname(resolve(storyFilePath));

    while (true) {
        const packageEntry = join(dir, 'node_modules', importId, 'index');
        const found = findExistingModulePath(modulePathCandidates(packageEntry));

        if (found) {
            return found;
        }

        const parent = dirname(dir);

        if (parent === dir) {
            break;
        }

        dir = parent;
    }

    return undefined;
}

export async function getComponents({
    csf,
    storyFilePath,
    additionalComponentNames = [],
}: {
    csf: CsfFile;
    storyFilePath: string;
    additionalComponentNames?: string[];
}): Promise<ComponentRef[]> {
    const componentSet = new Set<string>();
    const componentDepth = new Map<string, number>();
    const localToImport = collectImportBindings(csf.program);
    // Number of JSX elements enclosing each node, counting the node itself when it is one.
    const jsxDepth = new Map<ESTreeNode, number>();

    walk(csf.program, (node, parent) => {
        const depth = (parent ? (jsxDepth.get(parent) ?? 0) : 0) + (node.type === 'JSXElement' ? 1 : 0);

        jsxDepth.set(node, depth);

        if (node.type !== 'JSXOpeningElement') {
            return;
        }

        const n = node.name;
        let name: string | undefined;

        if (n.type === 'JSXIdentifier') {
            name = n.name;

            if (name && /[A-Z]/.test(name.charAt(0))) {
                componentSet.add(name);
            }
        }
        else if (n.type === 'JSXMemberExpression') {
            const jsxNameToString = (nm: ESTree.JSXMemberExpression | ESTree.JSXIdentifier): string => (
                nm.type === 'JSXIdentifier'
                    ? nm.name
                    : `${ jsxNameToString(nm.object) }.${ jsxNameToString(nm.property) }`
            );

            name = jsxNameToString(n);
            componentSet.add(name);
        }

        if (name) {
            // The opening element shares its JSXElement's depth, which counts that element itself.
            const wrappingDepth = depth - 1;
            const existing = componentDepth.get(name);

            if (existing === undefined || wrappingDepth < existing) {
                componentDepth.set(name, wrappingDepth);
            }
        }
    });

    const metaComp = csf._meta?.component;

    if (metaComp) {
        componentSet.add(metaComp);
    }

    for (const componentName of additionalComponentNames) {
        componentSet.add(componentName);
    }

    const components = Array.from(componentSet).sort((a, b) => a.localeCompare(b));

    const isLocallyDefinedWithoutImport = (base: string) => {
        const binding = csf.editor.scopes.program.bindings.get(base);

        return binding ? binding.kind !== 'import' : false;
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

            if (component.importId) {
                const isPackage = !component.importId.startsWith('.');
                const componentPath = isPackage
                    ? resolvePackageComponentPath(storyFilePath, component.importId)
                    : resolveRelativeComponentPath(storyFilePath, component.importId);

                if (componentPath) {
                    return {
                        ...component,
                        path: componentPath,
                        ...(isPackage ? { isPackage: true as const } : {}),
                    };
                }

                if (isPackage) {
                    return { ...component, isPackage: true as const };
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
