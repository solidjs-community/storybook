import {
    isStringLiteral,
    lineIndent,
    metaObject,
    placeableTextOf,
    reindent,
    resolveIdentifierInit,
    staticKey,
    storyShapeError,
    textOf,
    walk,
} from 'storybook/internal/csf-tools';

import { invariant } from './invariant';

import type { CsfFile, ESTree as E, FunctionNode, ESTreeNode as Node } from 'storybook/internal/csf-tools';

type Args = Record<string, Node>;

/** A text edit of the story file, addressed by offsets into its code. */
interface Edit {
    start: number;
    end: number;
    text: string;
}

/** A `key: value` property; methods and accessors are not args. */
const isObjectProperty = (p: Node): p is E.ObjectProperty => p.type === 'Property' && !p.method && p.kind === 'init';

const keyOf = (p: E.ObjectProperty): string | null => staticKey(p) ?? null;

const isValidJsxAttrName = (n: string) => /^[A-Z_][\w:-]*$/i.test(n);

const isJsx = (node: Node | null | undefined): node is E.JSXElement | E.JSXFragment => (
    node?.type === 'JSXElement' || node?.type === 'JSXFragment'
);

const isFunctionNode = (node: Node | null | undefined): node is FunctionNode => (
    node?.type === 'ArrowFunctionExpression'
    || node?.type === 'FunctionExpression'
    || node?.type === 'FunctionDeclaration'
);

/**
 * Prints an arg value for a snippet line indented by `indent`, moving the value's continuation lines
 * from where it was written to that line.
 */
type ValuePrinter = (node: Node) => string;

const valuePrinter = (code: string, indent: string): ValuePrinter => node => (
    reindent(isJsx(node) ? textOf(node) : placeableTextOf(node), lineIndent(code, node.start), indent)
);

function buildInvalidSpread(entries: ReadonlyArray<[string, Node]>, print: ValuePrinter): string | null {
    if (entries.length === 0) {
        return null;
    }

    const members = entries.map(([k, v]) => `${ JSON.stringify(k) }: ${ print(v) }`);

    return `{...{ ${ members.join(', ') } }}`;
}

function argsRecordFromObjectNode(obj?: E.ObjectExpression | null): Args {
    return obj
        ? Object.fromEntries(
            obj.properties
                .filter(isObjectProperty)
                .map(p => [keyOf(p), p.value] as const)
                .filter(e => Boolean(e[0]))
        )
        : {};
}

function storyArgsAssignment(program: E.Program, storyName: string): E.ObjectExpression | null {
    let found: E.ObjectExpression | null = null;

    walk(program, (node) => {
        if (node.type !== 'AssignmentExpression' || node.left.type !== 'MemberExpression') {
            return;
        }

        const { object: obj, property: prop, computed } = node.left;
        const isStoryIdent = obj.type === 'Identifier' && obj.name === storyName;
        const isArgsProp = (prop.type === 'Identifier' && prop.name === 'args' && !computed)
            || (isStringLiteral(prop) && computed && prop.value === 'args');

        if (isStoryIdent && isArgsProp && node.right.type === 'ObjectExpression') {
            found = node.right;
        }
    });

    return found;
}

function metaArgsRecord(meta?: E.ObjectExpression | null): Args {
    if (!meta) {
        return {};
    }

    const argsProp = meta.properties.find(
        (p): p is E.ObjectProperty => isObjectProperty(p) && keyOf(p) === 'args'
    );

    if (argsProp?.value.type !== 'ObjectExpression') {
        return {};
    }

    return argsRecordFromObjectNode(argsProp.value);
}

function toAttr(key: string, value: Node, print: ValuePrinter): string {
    if (value.type === 'Literal' && typeof value.value === 'boolean') {
        return value.value ? key : `${ key }={false}`;
    }

    // A JSX attribute string has no escapes, decodes entities and folds line breaks, so a value it
    // cannot hold as written stays an expression.
    if (isStringLiteral(value) && !/["&\r\n]/.test(value.value)) {
        return `${ key }="${ value.value }"`;
    }

    return `${ key }={${ print(value) }}`;
}

/** JSX children for a `children` arg, or `undefined` when there is none. */
function toJsxChildren(node: Node | null | undefined, print: ValuePrinter): string | undefined {
    if (!node) {
        return undefined;
    }

    if (isStringLiteral(node)) {
        return node.value;
    }

    if (isJsx(node)) {
        return print(node);
    }

    return `{${ print(node) }}`;
}

/** Return `key` if expression is `args.key` (incl. optional chaining), else `null`. */
function getArgsMemberKey(expr: Node) {
    const member = expr.type === 'ChainExpression' ? expr.expression : expr;

    if (member.type !== 'MemberExpression' || member.object.type !== 'Identifier' || member.object.name !== 'args') {
        return null;
    }

    if (member.property.type === 'Identifier' && !member.computed) {
        return member.property.name;
    }

    if (isStringLiteral(member.property) && member.computed) {
        return member.property.value;
    }

    return null;
}

/** Attributes for every arg not already set by name, with invalid names collected in one spread. */
function injectedAttributes(merged: Args, existing: ReadonlySet<string>, print: ValuePrinter): string[] {
    const entries = Object.entries(merged).filter(
        ([k, v]) => v != null && k !== 'children' && !existing.has(k)
    );
    const attrs = entries.filter(([k]) => isValidJsxAttrName(k)).map(([k, v]) => toAttr(k, v, print));
    const invalidSpread = buildInvalidSpread(entries.filter(([k]) => !isValidJsxAttrName(k)), print);

    return invalidSpread ? [...attrs, invalidSpread] : attrs;
}

/**
 * Records the edits that expand `{...args}` into the merged args and inline `args.foo` reads, and
 * returns whether there were any.
 */
function rewriteJsx(
    code: string,
    node: E.JSXElement | E.JSXFragment,
    merged: Args,
    edits: Edit[]
): boolean {
    let changed = false;

    if (node.type === 'JSXElement') {
        const opening = node.openingElement;
        const attrs = opening.attributes;
        const isArgsSpread = (a: Node) => (
            a.type === 'JSXSpreadAttribute' && a.argument.type === 'Identifier' && a.argument.name === 'args'
        );
        const firstSpread = attrs.findIndex(isArgsSpread);
        const tagEnd = (opening.typeArguments ?? opening.name).end;

        if (firstSpread !== -1) {
            changed = true;

            const existing = new Set(
                attrs.flatMap(a => (a.type === 'JSXAttribute' && a.name.type === 'JSXIdentifier' ? [a.name.name] : []))
            );
            const pieces = injectedAttributes(merged, existing, valuePrinter(code, lineIndent(code, attrs[firstSpread]!.start))).join(' ');

            // The args go where the first spread was; later spreads are dropped.
            attrs.forEach((a, index) => {
                if (!isArgsSpread(a)) {
                    return;
                }

                if (index === firstSpread && pieces) {
                    edits.push({ start: a.start, end: a.end, text: pieces });
                }
                else {
                    edits.push({ start: index > 0 ? attrs[index - 1]!.end : tagEnd, end: a.end, text: '' });
                }
            });

            const children = node.children.length === 0
                ? toJsxChildren(merged['children'], valuePrinter(code, lineIndent(code, opening.start)))
                : undefined;

            if (children !== undefined) {
                if (opening.selfClosing) {
                    const name = code.slice(opening.name.start, opening.name.end);
                    const lastEnd = attrs.at(-1)?.end ?? tagEnd;

                    edits.push({ start: lastEnd, end: opening.end, text: `>${ children }</${ name }>` });
                }
                else {
                    edits.push({ start: opening.end, end: opening.end, text: children });
                }
            }
        }

        for (const a of attrs) {
            if (a.type !== 'JSXAttribute' || a.name.type !== 'JSXIdentifier' || a.value?.type !== 'JSXExpressionContainer') {
                continue;
            }

            const key = getArgsMemberKey(a.value.expression);
            const mergedValue = key !== null && Object.hasOwn(merged, key) ? merged[key] : undefined;

            if (mergedValue !== undefined) {
                edits.push({ start: a.start, end: a.end, text: toAttr(a.name.name, mergedValue, valuePrinter(code, lineIndent(code, a.start))) });
                changed = true;
            }
        }
    }

    for (const child of node.children) {
        if (isJsx(child)) {
            changed = rewriteJsx(code, child, merged, edits) || changed;
        }
        else if (child.type === 'JSXExpressionContainer' && getArgsMemberKey(child.expression) === 'children') {
            const children = toJsxChildren(merged['children'], valuePrinter(code, lineIndent(code, child.start)));

            if (children !== undefined) {
                edits.push({ start: child.start, end: child.end, text: children });
                changed = true;
            }
        }
    }

    return changed;
}

/** The source of `range` with `edits` applied, dedented so it does not carry the story file's nesting. */
function printRange(code: string, range: { start: number; end: number }, edits: Edit[]): string {
    let text = '';
    let cursor = range.start;

    for (const edit of [...edits].sort((a, b) => a.start - b.start || a.end - b.end)) {
        text += code.slice(cursor, edit.start) + edit.text;
        cursor = edit.end;
    }

    text += code.slice(cursor, range.end);

    return reindent(text, lineIndent(code, range.start), '');
}

function getFunctionBodyStatements(fn: FunctionNode) {
    return fn.body?.type === 'BlockStatement' ? fn.body.body : undefined;
}

type RenderResolution
    = | { kind: 'missing' }
        | { kind: 'resolved'; node: FunctionNode }
        | { kind: 'unresolved' };

function resolveStoryFn(storyRender: RenderResolution, metaRender: RenderResolution) {
    if (storyRender.kind === 'resolved') {
        return storyRender.node;
    }

    if (storyRender.kind === 'missing' && metaRender.kind === 'resolved') {
        return metaRender.node;
    }

    return undefined;
}

/**
 * Source of a `const` or `function` declaration, named after the story, that shows how to render
 * it: the story's own function or `render`, with the args it reads inlined, or the component with
 * the story's args as attributes.
 */
export function getCodeSnippet(csf: CsfFile, storyName: string, componentName?: string): string {
    const editor = csf._editor;
    const { code } = editor;
    const storyDeclaration = csf._storyExports[storyName];
    const metaObj = metaObject(csf);

    if (!storyDeclaration) {
        const message = 'Expected story to be a function or variable declaration';
        const statement = csf._program.body.find(
            node => node.type === 'ExportNamedDeclaration'
                && node.specifiers.some(
                    specifier => (specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value) === storyName
                )
        );

        throw statement ? storyShapeError(message, statement, editor) : message;
    }

    let storyNode: E.Function | E.Expression;

    if (storyDeclaration.type === 'FunctionDeclaration') {
        storyNode = storyDeclaration;
    }
    else if (storyDeclaration.type === 'VariableDeclarator') {
        const { init } = storyDeclaration;

        invariant(
            init,
            () => storyShapeError('Expected story initializer to be an expression', storyDeclaration, editor).message
        );
        storyNode = init;
    }
    else {
        throw storyShapeError('Expected story to be a function or variable declaration', storyDeclaration, editor);
    }

    let normalized: E.Function | E.Expression = storyNode;

    if (storyNode.type === 'CallExpression') {
        const callee = storyNode.callee;

        if (callee.type === 'MemberExpression') {
            const { object: obj, property: prop } = callee;
            const isBind = (prop.type === 'Identifier' && prop.name === 'bind')
                || (isStringLiteral(prop) && prop.value === 'bind');

            if (obj.type === 'Identifier' && isBind) {
                const resolved = resolveIdentifierInit(csf._program, obj.name);

                if (resolved) {
                    normalized = resolved;
                }
            }
        }

        if (normalized === storyNode) {
            const args = storyNode.arguments;

            if (args.length !== 0) {
                const call = storyNode;
                const evaluationError = () => storyShapeError('Could not evaluate story expression', call, editor).message;

                invariant(args.length === 1, evaluationError);

                const storyArg = args[0];

                invariant(storyArg && storyArg.type !== 'SpreadElement', evaluationError);
                normalized = storyArg;
            }
        }
    }

    if (normalized.type === 'TSSatisfiesExpression' || normalized.type === 'TSAsExpression') {
        normalized = normalized.expression;
    }

    let storyFn: FunctionNode | undefined;

    if (isFunctionNode(normalized)) {
        storyFn = normalized;
    }
    else if (normalized.type !== 'ObjectExpression') {
        const isEmptyCsf4Story = normalized.type === 'CallExpression' && normalized.arguments.length === 0;

        if (!isEmptyCsf4Story) {
            throw storyShapeError(
                'Expected story to be csf factory, function or an object expression',
                normalized,
                editor
            );
        }
    }

    const storyProps = normalized.type === 'ObjectExpression' ? normalized.properties.filter(isObjectProperty) : [];
    const metaProps = metaObj ? metaObj.properties.filter(isObjectProperty) : [];

    const getRender = (object: E.ObjectProperty[]): RenderResolution => {
        const render = object.find(p => keyOf(p) === 'render')?.value;

        if (!render) {
            return { kind: 'missing' };
        }

        if (render.type === 'Identifier') {
            const resolved = resolveIdentifierInit(csf._program, render.name);

            return isFunctionNode(resolved) ? { kind: 'resolved', node: resolved } : { kind: 'unresolved' };
        }

        if (!(render.type === 'ArrowFunctionExpression' || render.type === 'FunctionExpression')) {
            throw storyShapeError('Expected render to be an arrow function or function expression', render, editor);
        }

        return { kind: 'resolved', node: render };
    };

    const metaRender = getRender(metaProps);
    const storyRender = getRender(storyProps);

    if (!storyFn) {
        storyFn = resolveStoryFn(storyRender, metaRender);
    }

    const metaArgs = metaArgsRecord(metaObj);
    const storyArgsNode = storyProps
        .filter(p => keyOf(p) === 'args')
        .map(p => p.value)
        .find((v): v is E.ObjectExpression => v.type === 'ObjectExpression');
    const storyArgs = argsRecordFromObjectNode(storyArgsNode);
    const storyAssignedArgs = argsRecordFromObjectNode(storyArgsAssignment(csf._program, storyName));
    const merged: Args = { ...metaArgs, ...storyArgs, ...storyAssignedArgs };

    if (storyFn) {
        const fn = storyFn;
        const asyncPrefix = fn.async ? 'async ' : '';
        const functionKeyword = `${ asyncPrefix }function${ fn.generator ? '*' : '' }`;

        if (fn.type === 'ArrowFunctionExpression' && isJsx(fn.body)) {
            const edits: Edit[] = [];

            if (rewriteJsx(code, fn.body, merged, edits)) {
                return `const ${ storyName } = ${ asyncPrefix }() => ${ printRange(code, fn.body, edits) };`;
            }
        }

        const stmts = getFunctionBodyStatements(fn);

        if (stmts && fn.body) {
            const edits: Edit[] = [];
            let changed = false;

            for (const stmt of stmts) {
                if (stmt.type === 'ReturnStatement' && isJsx(stmt.argument)) {
                    changed = rewriteJsx(code, stmt.argument, merged, edits) || changed;
                }
            }

            if (changed) {
                const body = printRange(code, fn.body, edits);

                return fn.type === 'FunctionDeclaration'
                    ? `${ functionKeyword } ${ storyName }() ${ body }`
                    : `const ${ storyName } = ${ asyncPrefix }() => ${ body };`;
            }
        }

        if (fn.type === 'FunctionDeclaration' && fn.body) {
            const params = fn.params.length > 0 ? code.slice(fn.params[0]!.start, fn.params.at(-1)!.end) : '';

            return `${ functionKeyword } ${ storyName }(${ params }) ${ printRange(code, fn.body, []) }`;
        }

        return `const ${ storyName } = ${ printRange(code, fn, []) };`;
    }

    invariant(componentName, 'Could not generate snippet without component name.');

    const print = valuePrinter(code, '');
    const attrs = injectedAttributes(merged, new Set(), print);
    const children = toJsxChildren(merged['children'], print);
    const opening = [componentName, ...attrs].join(' ');
    const element = children === undefined ? `<${ opening } />` : `<${ opening }>${ children }</${ componentName }>`;

    return `const ${ storyName } = () => ${ element };`;
}
