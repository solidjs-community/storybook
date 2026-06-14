import { types as t, type NodePath } from 'storybook/internal/babel';

import { invariant } from './invariant';

import type { CsfFile } from 'storybook/internal/csf-tools';

const keyOf = (p: t.ObjectProperty): string | null => (
    t.isIdentifier(p.key) ? p.key.name : t.isStringLiteral(p.key) ? p.key.value : null
);

const isValidJsxAttrName = (n: string) => /^[A-Za-z_][A-Za-z0-9_:-]*$/.test(n);

function buildInvalidSpread(entries: ReadonlyArray<[string, t.Node]>): t.JSXSpreadAttribute | null {
    if (entries.length === 0) {
        return null;
    }

    const objectProps = entries.map(([k, v]) => t.objectProperty(
        t.stringLiteral(k),
        t.isExpression(v) ? v : t.identifier('undefined')
    ));

    return t.jsxSpreadAttribute(t.objectExpression(objectProps));
}

const argsRecordFromObjectPath = (objPath?: NodePath<t.ObjectExpression> | null) => (
    objPath
        ? Object.fromEntries(
            objPath
                .get('properties')
                .filter(p => p.isObjectProperty())
                .map(p => [keyOf(p.node), p.get('value').node])
                .filter(e => Boolean(e[0]))
        )
        : {}
);

function storyArgsAssignmentPath(
    program: NodePath<t.Program>,
    storyName: string
): NodePath<t.ObjectExpression> | null {
    let found: NodePath<t.ObjectExpression> | null = null;

    program.traverse({
        AssignmentExpression(p) {
            const left = p.get('left');
            const right = p.get('right');

            if (left.isMemberExpression()) {
                const obj = left.get('object');
                const prop = left.get('property');
                const isStoryIdent = obj.isIdentifier() && obj.node.name === storyName;
                const isArgsProp = (prop.isIdentifier() && prop.node.name === 'args' && !left.node.computed)
                  || (t.isStringLiteral(prop.node) && left.node.computed && prop.node.value === 'args');

                if (isStoryIdent && isArgsProp && right.isObjectExpression()) {
                    found = right;
                }
            }
        },
    });

    return found;
}

const argsRecordFromObjectNode = (obj?: t.ObjectExpression | null) => (
    obj
        ? Object.fromEntries(
            obj.properties
                .filter((p): p is t.ObjectProperty => t.isObjectProperty(p))
                .map(p => [keyOf(p), p.value])
                .filter(e => Boolean(e[0]))
        )
        : {}
);

const metaArgsRecord = (meta?: t.ObjectExpression | null) => {
    if (!meta) {
        return {};
    }

    const argsProp = meta.properties.find(
        (p): p is t.ObjectProperty => t.isObjectProperty(p) && keyOf(p) === 'args'
    );

    if (!argsProp || !t.isObjectExpression(argsProp.value)) {
        return {};
    }

    return argsRecordFromObjectNode(argsProp.value);
};

const toAttr = (key: string, value: t.Node) => {
    if (t.isBooleanLiteral(value)) {
        return value.value
            ? t.jsxAttribute(t.jsxIdentifier(key), null)
            : t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value));
    }

    if (t.isStringLiteral(value)) {
        return t.jsxAttribute(t.jsxIdentifier(key), t.stringLiteral(value.value));
    }

    if (t.isExpression(value)) {
        return t.jsxAttribute(t.jsxIdentifier(key), t.jsxExpressionContainer(value));
    }

    return null;
};

const toJsxChildren = (node: t.Node | null | undefined) => {
    if (!node) {
        return [];
    }

    if (t.isStringLiteral(node)) {
        return [t.jsxText(node.value)];
    }

    if (t.isJSXElement(node) || t.isJSXFragment(node)) {
        return [node];
    }

    if (t.isExpression(node)) {
        return [t.jsxExpressionContainer(node)];
    }

    return [];
};

function getArgsMemberKey(expr: t.Node) {
    if (t.isMemberExpression(expr) && t.isIdentifier(expr.object) && expr.object.name === 'args') {
        if (t.isIdentifier(expr.property) && !expr.computed) {
            return expr.property.name;
        }

        if (t.isStringLiteral(expr.property) && expr.computed) {
            return expr.property.value;
        }
    }

    if (
        t.isOptionalMemberExpression?.(expr)
        && t.isIdentifier(expr.object)
        && expr.object.name === 'args'
    ) {
        const prop = expr.property;

        if (t.isIdentifier(prop) && !expr.computed) {
            return prop.name;
        }

        if (t.isStringLiteral(prop) && expr.computed) {
            return prop.value;
        }
    }

    return null;
}

function inlineArgsInJsx(
    node: t.JSXElement | t.JSXFragment,
    merged: Record<string, t.Node>
): { node: t.JSXElement | t.JSXFragment; changed: boolean } {
    let changed = false;

    if (t.isJSXElement(node)) {
        const opening = node.openingElement;

        const newAttrs = opening.attributes.flatMap<t.JSXAttribute | t.JSXSpreadAttribute>((a) => {
            if (!t.isJSXAttribute(a)) {
                return [a];
            }

            const name = t.isJSXIdentifier(a.name) ? a.name.name : null;

            if (!(name && a.value && t.isJSXExpressionContainer(a.value))) {
                return [a];
            }

            const key = getArgsMemberKey(a.value.expression);

            if (!(key && key in merged)) {
                return [a];
            }

            const mergedValue = merged[key];

            if (mergedValue === undefined) {
                return [a];
            }

            const repl = toAttr(name, mergedValue);

            changed = true;

            return repl ? [repl] : [];
        });

        const newChildren = node.children.flatMap<
            t.JSXText | t.JSXExpressionContainer | t.JSXSpreadChild | t.JSXElement | t.JSXFragment
        >((c) => {
            if (t.isJSXElement(c) || t.isJSXFragment(c)) {
                const res = inlineArgsInJsx(c, merged);

                changed ||= res.changed;

                return [res.node];
            }

            if (t.isJSXExpressionContainer(c)) {
                const key = getArgsMemberKey(c.expression);

                if (key === 'children' && merged['children']) {
                    changed = true;

                    return toJsxChildren(merged['children']);
                }
            }

            return [c];
        });

        const selfClosing = opening.selfClosing && newChildren.length === 0;

        return {
            node: t.jsxElement(
                t.jsxOpeningElement(opening.name, newAttrs, selfClosing),
                selfClosing ? null : (node.closingElement ?? t.jsxClosingElement(opening.name)),
                newChildren,
                selfClosing
            ),
            changed,
        };
    }

    const fragChildren = node.children.flatMap((c): (typeof c)[] => {
        if (t.isJSXElement(c) || t.isJSXFragment(c)) {
            const res = inlineArgsInJsx(c, merged);

            changed ||= res.changed;

            return [res.node];
        }

        if (t.isJSXExpressionContainer(c)) {
            const key = getArgsMemberKey(c.expression);

            if (key === 'children' && 'children' in merged) {
                changed = true;

                return toJsxChildren(merged['children']);
            }
        }

        return [c];
    });

    return { node: t.jsxFragment(node.openingFragment, node.closingFragment, fragChildren), changed };
}

function transformArgsSpreadsInJsx(
    node: t.JSXElement | t.JSXFragment,
    merged: Record<string, t.Node>
): { node: t.JSXElement | t.JSXFragment; changed: boolean } {
    let changed = false;

    const makeInjectedPieces = (
        existing: ReadonlySet<string>
    ): Array<t.JSXAttribute | t.JSXSpreadAttribute> => {
        const entries = Object.entries(merged).filter(([k, v]) => v != null && k !== 'children');
        const validEntries = entries.filter(([k]) => isValidJsxAttrName(k));
        const invalidEntries = entries.filter(([k]) => !isValidJsxAttrName(k));

        const injectedAttrs = validEntries
            .map(([k, v]) => toAttr(k, v))
            .filter((a): a is t.JSXAttribute => Boolean(a))
            .filter(a => t.isJSXIdentifier(a.name) && !existing.has(a.name.name));

        const invalidSpread = buildInvalidSpread(invalidEntries.filter(([k]) => !existing.has(k)));

        return invalidSpread ? [...injectedAttrs, invalidSpread] : injectedAttrs;
    };

    if (t.isJSXElement(node)) {
        const opening = node.openingElement;
        const attrs = opening.attributes;

        const isArgsSpread = (a: t.JSXAttribute | t.JSXSpreadAttribute) => (
            t.isJSXSpreadAttribute(a) && t.isIdentifier(a.argument) && a.argument.name === 'args'
        );

        const sawArgsSpread = attrs.some(isArgsSpread);
        const firstIdx = attrs.findIndex(isArgsSpread);
        const nonArgsAttrs = attrs.filter(a => !isArgsSpread(a));
        const insertionIndex = sawArgsSpread
            ? attrs.slice(0, firstIdx).filter(a => !isArgsSpread(a)).length
            : 0;

        const newAttrs = sawArgsSpread
            ? (() => {
                const existing = new Set(
                    nonArgsAttrs
                        .filter((a): a is t.JSXAttribute => t.isJSXAttribute(a))
                        .flatMap(a => (t.isJSXIdentifier(a.name) ? [a.name.name] : []))
                );
                const pieces = makeInjectedPieces(existing);

                changed = true;

                return [
                    ...nonArgsAttrs.slice(0, insertionIndex),
                    ...pieces,
                    ...nonArgsAttrs.slice(insertionIndex),
                ];
            })()
            : nonArgsAttrs;

        const newChildren = node.children.flatMap((c): (typeof c)[] => {
            if (t.isJSXElement(c) || t.isJSXFragment(c)) {
                const res = transformArgsSpreadsInJsx(c, merged);

                changed ||= res.changed;

                return [res.node];
            }

            return [c];
        });

        let children = newChildren;

        if (sawArgsSpread && newChildren.length === 0 && merged['children']) {
            changed = true;
            children = toJsxChildren(merged['children']);
        }

        const selfClosing = children.length === 0;

        return {
            node: t.jsxElement(
                t.jsxOpeningElement(opening.name, newAttrs, selfClosing),
                selfClosing ? null : (node.closingElement ?? t.jsxClosingElement(opening.name)),
                children,
                selfClosing
            ),
            changed,
        };
    }

    const fragChildren = node.children.flatMap((c): (typeof c)[] => {
        if (t.isJSXElement(c) || t.isJSXFragment(c)) {
            const res = transformArgsSpreadsInJsx(c, merged);

            changed ||= res.changed;

            return [res.node];
        }

        return [c];
    });

    return { node: t.jsxFragment(node.openingFragment, node.closingFragment, fragChildren), changed };
}

function resolveIdentifierInit(storyPath: NodePath<t.Node>, identifier: NodePath<t.Identifier>) {
    const programPath = storyPath.findParent(p => p.isProgram()) as NodePath<t.Program> | null;

    if (!programPath) {
        return null;
    }

    for (const stmt of programPath.get('body')) {
        if (stmt.isFunctionDeclaration() && stmt.node.id?.name === identifier.node.name) {
            return stmt;
        }

        if (stmt.isExportNamedDeclaration()) {
            const decl = stmt.get('declaration');

            if (decl.isFunctionDeclaration() && decl.node.id?.name === identifier.node.name) {
                return decl;
            }
        }
    }

    const match = programPath.get('body').flatMap((stmt) => {
        if (stmt.isVariableDeclaration()) {
            return stmt.get('declarations');
        }

        if (stmt.isExportNamedDeclaration()) {
            const decl = stmt.get('declaration');

            if (decl?.isVariableDeclaration()) {
                return decl.get('declarations');
            }
        }

        return [];
    }).find((d) => {
        const id = d.get('id');

        return id.isIdentifier() && id.node.name === identifier.node.name;
    });

    if (!match) {
        return null;
    }

    const init = match.get('init');

    return init?.isExpression() ? init : null;
}

export function pathForNode<T extends t.Node>(
    program: NodePath<t.Program>,
    target: T | undefined
): NodePath<T> | undefined {
    if (!target) {
        return undefined;
    }

    let found: NodePath<T> | undefined;

    program.traverse({
        enter(p) {
            if (p.node && p.node === target) {
                found = p as NodePath<T>;
                p.stop();
            }
        },
    });

    return found;
}

function getFunctionBodyStatements(
    fn: t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration
) {
    if (t.isFunctionDeclaration(fn)) {
        return fn.body.body;
    }

    if (t.isArrowFunctionExpression(fn) && t.isBlockStatement(fn.body)) {
        return fn.body.body;
    }

    if (t.isFunctionExpression(fn) && t.isBlockStatement(fn.body)) {
        return fn.body.body;
    }

    return undefined;
}

function resolveStoryFn(
    storyRender: { kind: 'missing' | 'resolved' | 'unresolved'; path?: NodePath<t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration> },
    metaRender: { kind: 'missing' | 'resolved' | 'unresolved'; path?: NodePath<t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration> }
) {
    if (storyRender.kind === 'resolved') {
        return storyRender.path;
    }

    if (storyRender.kind === 'missing' && metaRender.kind === 'resolved') {
        return metaRender.path;
    }

    return undefined;
}

export function getCodeSnippet(
    csf: CsfFile,
    storyName: string,
    componentName?: string
): t.VariableDeclaration | t.FunctionDeclaration {
    const storyDeclaration = csf._storyDeclarationPath[storyName];
    const metaObj = csf._metaNode;

    if (!storyDeclaration) {
        const message = 'Expected story to be a function or variable declaration';

        throw csf._storyPaths[storyName]?.buildCodeFrameError(message) ?? message;
    }

    let storyPath: NodePath<t.FunctionDeclaration | t.Expression>;

    if (storyDeclaration.isFunctionDeclaration()) {
        storyPath = storyDeclaration;
    }
    else if (storyDeclaration.isVariableDeclarator()) {
        const init = storyDeclaration.get('init');

        invariant(
            init.isExpression(),
            () => storyDeclaration.buildCodeFrameError('Expected story initializer to be an expression').message
        );
        storyPath = init;
    }
    else {
        throw storyDeclaration.buildCodeFrameError(
            'Expected story to be a function or variable declaration'
        );
    }

    let normalizedPath: NodePath<t.FunctionDeclaration | t.Expression> = storyPath;

    if (storyPath.isCallExpression()) {
        const callee = storyPath.get('callee');

        if (callee.isMemberExpression()) {
            const obj = callee.get('object');
            const prop = callee.get('property');
            const isBind = (prop.isIdentifier() && prop.node.name === 'bind')
              || (t.isStringLiteral(prop.node) && prop.node.value === 'bind');

            if (obj.isIdentifier() && isBind) {
                const resolved = resolveIdentifierInit(storyDeclaration, obj);

                if (resolved) {
                    normalizedPath = resolved;
                }
            }
        }

        if (storyPath === normalizedPath) {
            const args = storyPath.get('arguments');

            if (args.length !== 0) {
                invariant(
                    args.length === 1,
                    () => storyPath.buildCodeFrameError('Could not evaluate story expression').message
                );
                const storyArg = args[0];

                if (!storyArg) {
                    throw storyPath.buildCodeFrameError('Could not evaluate story expression');
                }

                invariant(
                    storyArg.isExpression(),
                    () => storyPath.buildCodeFrameError('Could not evaluate story expression').message
                );
                normalizedPath = storyArg;
            }
        }
    }

    if (normalizedPath.isTSSatisfiesExpression()) {
        normalizedPath = normalizedPath.get('expression');
    }
    else if (normalizedPath.isTSAsExpression()) {
        normalizedPath = normalizedPath.get('expression');
    }

    let storyFn:
      | NodePath<t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration>
      | undefined;

    if (
        normalizedPath.isArrowFunctionExpression()
        || normalizedPath.isFunctionExpression()
        || normalizedPath.isFunctionDeclaration()
    ) {
        storyFn = normalizedPath;
    }
    else if (!normalizedPath.isObjectExpression()) {
        const isEmptyCsf4Story = normalizedPath.isCallExpression()
          && Array.isArray(normalizedPath.node.arguments)
          && normalizedPath.node.arguments.length === 0;

        if (!isEmptyCsf4Story) {
            throw normalizedPath.buildCodeFrameError(
                'Expected story to be csf factory, function or an object expression'
            );
        }
    }

    const storyProps = normalizedPath.isObjectExpression()
        ? normalizedPath.get('properties').filter(p => p.isObjectProperty())
        : [];

    const metaPath = pathForNode(csf._file.path, metaObj);
    const metaProps = metaPath?.isObjectExpression()
        ? metaPath.get('properties').filter(p => p.isObjectProperty())
        : [];

    type RenderResolution
        = | { kind: 'missing' }
          | {
              kind: 'resolved';
              path: NodePath<t.ArrowFunctionExpression | t.FunctionExpression | t.FunctionDeclaration>;
          }
          | { kind: 'unresolved' };

    const getRenderPath = (object: NodePath<t.ObjectProperty>[]): RenderResolution => {
        const renderPath = object.find(p => keyOf(p.node) === 'render')?.get('value');

        if (!renderPath) {
            return { kind: 'missing' };
        }

        if (renderPath.isIdentifier()) {
            const resolved = resolveIdentifierInit(storyDeclaration, renderPath);

            if (
                resolved
                && (resolved.isArrowFunctionExpression()
                  || resolved.isFunctionExpression()
                  || resolved.isFunctionDeclaration())
            ) {
                return { kind: 'resolved', path: resolved };
            }

            return { kind: 'unresolved' };
        }

        if (!(renderPath.isArrowFunctionExpression() || renderPath.isFunctionExpression())) {
            throw renderPath.buildCodeFrameError(
                'Expected render to be an arrow function or function expression'
            );
        }

        return { kind: 'resolved', path: renderPath };
    };

    const metaRender = getRenderPath(metaProps);
    const storyRender = getRenderPath(storyProps);

    if (!storyFn) {
        storyFn = resolveStoryFn(storyRender, metaRender);
    }

    const metaArgs = metaArgsRecord(metaObj ?? null);
    const storyArgsPath = storyProps
        .filter(p => keyOf(p.node) === 'args')
        .map(p => p.get('value'))
        .find(v => v.isObjectExpression());
    const storyArgs = argsRecordFromObjectPath(storyArgsPath);
    const storyAssignedArgsPath = storyArgsAssignmentPath(csf._file.path, storyName);
    const storyAssignedArgs = argsRecordFromObjectPath(storyAssignedArgsPath);
    const merged: Record<string, t.Node> = { ...metaArgs, ...storyArgs, ...storyAssignedArgs };

    const entries = Object.entries(merged).filter(([k]) => k !== 'children');
    const validEntries = entries.filter(([k, v]) => isValidJsxAttrName(k) && v != null);
    const invalidEntries = entries.filter(([k, v]) => !isValidJsxAttrName(k) && v != null);
    const injectedAttrs = validEntries.map(([k, v]) => toAttr(k, v)).filter(a => a != null);

    if (storyFn) {
        const fn = storyFn.node;

        if (t.isArrowFunctionExpression(fn) && (t.isJSXElement(fn.body) || t.isJSXFragment(fn.body))) {
            const spreadRes = transformArgsSpreadsInJsx(fn.body, merged);
            const inlineRes = inlineArgsInJsx(spreadRes.node, merged);

            if (spreadRes.changed || inlineRes.changed) {
                const newFn = t.arrowFunctionExpression([], inlineRes.node, fn.async);

                return t.variableDeclaration('const', [
                    t.variableDeclarator(t.identifier(storyName), newFn),
                ]);
            }
        }

        const stmts = getFunctionBodyStatements(fn);

        if (stmts) {
            let changed = false;
            const newBody = stmts.map((stmt) => {
                if (
                    t.isReturnStatement(stmt)
                    && stmt.argument
                    && (t.isJSXElement(stmt.argument) || t.isJSXFragment(stmt.argument))
                ) {
                    const spreadRes = transformArgsSpreadsInJsx(stmt.argument, merged);
                    const inlineRes = inlineArgsInJsx(spreadRes.node, merged);

                    if (spreadRes.changed || inlineRes.changed) {
                        changed = true;

                        return t.returnStatement(inlineRes.node);
                    }
                }

                return stmt;
            });

            if (changed) {
                return t.isFunctionDeclaration(fn)
                    ? t.functionDeclaration(
                        t.identifier(storyName),
                        [],
                        t.blockStatement(newBody),
                        fn.generator,
                        fn.async
                    )
                    : t.variableDeclaration('const', [
                        t.variableDeclarator(
                            t.identifier(storyName),
                            t.arrowFunctionExpression([], t.blockStatement(newBody), fn.async)
                        ),
                    ]);
            }
        }

        return t.isFunctionDeclaration(fn)
            ? t.functionDeclaration(t.identifier(storyName), fn.params, fn.body, fn.generator, fn.async)
            : t.variableDeclaration('const', [t.variableDeclarator(t.identifier(storyName), fn)]);
    }

    invariant(componentName, 'Could not generate snippet without component name.');
    const invalidSpread = buildInvalidSpread(invalidEntries);
    const name = t.jsxIdentifier(componentName);
    const openingElAttrs = invalidSpread ? [...injectedAttrs, invalidSpread] : injectedAttrs;

    const children = toJsxChildren(merged['children']);
    const selfClosing = children.length === 0;
    const arrow = t.arrowFunctionExpression(
        [],
        t.jsxElement(
            t.jsxOpeningElement(name, openingElAttrs, selfClosing),
            selfClosing ? null : t.jsxClosingElement(name),
            children,
            selfClosing
        )
    );

    return t.variableDeclaration('const', [t.variableDeclarator(t.identifier(storyName), arrow)]);
}
