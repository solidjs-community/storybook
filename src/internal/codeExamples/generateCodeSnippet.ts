import {
    collectImportBindings,
    createStoryArgsResolver,
    detachedTextOf,
    isCanonicalCsf2BindCall,
    isStringLiteral,
    lineIndent,
    metaObject,
    normalizeStoryDeclaration,
    parseModule,
    reindent,
    resolveRenderFunction,
    storyShapeError,
    textOf,
    walk,
} from 'storybook/internal/csf-tools';

import { invariant } from './invariant';

import type {
    CsfFile,
    ESTree as E,
    FunctionNode,
    ESTreeNode as Node,
    RenderResolution,
    SourceEditor,
    StoryArgsResolver,
} from 'storybook/internal/csf-tools';

type Args = Record<string, Node>;

/** A text edit of the story file, addressed by offsets into its code. */
interface Edit {
    start: number;
    end: number;
    text: string;
}

/**
 * Source of a `const` or `function` declaration, named after the story, that shows how to render
 * it: the story's own function or `render`, with the args it reads inlined, or the component with
 * the story's args as attributes.
 */
export function getCodeSnippet(
    csf: CsfFile,
    storyName: string,
    componentName?: string,
    resolver: StoryArgsResolver = createStoryArgsResolver(csf)
): string {
    const editor = csf._editor;
    const declaration = csf._storyExports[storyName];

    if (!declaration) {
        const message = 'Expected story to be a function or variable declaration';
        const statement = csf._program.body.find(
            node => node.type === 'ExportNamedDeclaration'
                && node.specifiers.some(
                    specifier => (specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value) === storyName
                )
        );

        throw statement ? storyShapeError(message, statement, editor) : message;
    }

    const { args } = resolver.resolve(storyName);

    // `Template.bind({})` of an imported `Template`: the snippet calls the bound template with the args.
    if (
        declaration.type === 'VariableDeclarator'
        && isCanonicalCsf2BindCall(declaration.init)
        && collectImportBindings(csf._program).has(declaration.init.callee.object.name)
    ) {
        const print = valuePrinter('    ');
        const members = Object.entries(args).map(([key, value]) => `    ${ JSON.stringify(key) }: ${ print(value) }`);
        const argsObject = members.length > 0 ? `{\n${ members.join(',\n') }\n}` : '{}';

        return `const ${ storyName } = () => ${ textOf(declaration.init) }(${ argsObject });`;
    }

    const story = normalizeStoryDeclaration(declaration, editor);
    const metaRender = resolveRenderFunction(metaObject(csf), editor, resolver.ctx);
    const storyRender = resolveRenderFunction(story.type === 'config' ? story.node : undefined, editor, resolver.ctx);
    // A story whose `render` cannot be read does not fall back to the meta's, which it overrides.
    const storyFn = story.type === 'fn'
        ? story.node
        : renderFunctionOf(storyRender) ?? (storyRender.kind === 'missing' ? renderFunctionOf(metaRender) : undefined);

    if (storyFn) {
        return functionSnippet(editor, storyName, storyFn, args);
    }

    invariant(componentName, 'Could not generate snippet without component name.');

    const print = valuePrinter('');
    const attrs = injectedAttributes(args, new Set(), print);
    const children = toJsxChildren(args['children'], print);
    const opening = [componentName, ...attrs].join(' ');
    const element = children === undefined ? `<${ opening } />` : `<${ opening }>${ children }</${ componentName }>`;

    return `const ${ storyName } = () => ${ element };`;
}

// A `render` that a later spread may replace is still the best guess at what the story renders.
function renderFunctionOf(resolution: RenderResolution) {
    if (resolution.kind === 'resolved') {
        return resolution.node;
    }

    return resolution.kind === 'unresolved' ? resolution.shadowedRender : undefined;
}

/** The story function renamed to the story, with the args it reads inlined into its JSX. */
function functionSnippet(editor: SourceEditor, storyName: string, fn: FunctionNode, merged: Args): string {
    const { code } = editor;
    const asyncPrefix = fn.async ? 'async ' : '';
    const functionKeyword = `${ asyncPrefix }function${ fn.generator ? '*' : '' }`;
    const params = fn.params.length > 0 ? code.slice(fn.params[0]!.start, fn.params.at(-1)!.end) : '';
    const edits: Edit[] = [];

    if (fn.type === 'ArrowFunctionExpression' && isJsx(fn.body)) {
        if (rewriteJsx(code, fn.body, merged, edits)) {
            const body = printRange(code, fn.body, edits);
            const kept = readsArgs(`${ asyncPrefix }() => (${ body });`) ? params : '';

            return `const ${ storyName } = ${ asyncPrefix }(${ kept }) => ${ body };`;
        }
    }
    else if (fn.body?.type === 'BlockStatement') {
        let changed = false;

        for (const statement of fn.body.body) {
            if (statement.type === 'ReturnStatement' && isJsx(statement.argument)) {
                changed = rewriteJsx(code, statement.argument, merged, edits) || changed;
            }
        }

        if (changed) {
            const body = printRange(code, fn.body, edits);
            const kept = readsArgs(`${ functionKeyword } f() ${ body }`) ? params : '';

            return fn.type === 'FunctionDeclaration'
                ? `${ functionKeyword } ${ storyName }(${ kept }) ${ body }`
                : `const ${ storyName } = ${ asyncPrefix }(${ kept }) => ${ body };`;
        }
    }

    if (fn.type === 'FunctionDeclaration' && fn.body) {
        return `${ functionKeyword } ${ storyName }(${ params }) ${ printRange(code, fn.body, []) }`;
    }

    // A method's source starts at its parameters, so it is printed as an arrow function.
    if (isMethod(editor.parentOf(fn)) && fn.body) {
        return `const ${ storyName } = ${ asyncPrefix }(${ params }) => ${ printRange(code, fn.body, []) };`;
    }

    return `const ${ storyName } = ${ printRange(code, fn, []) };`;
}

const isMethod = (parent: Node | null) => parent?.type === 'Property' && (parent.method || parent.kind !== 'init');

const isJsx = (node: Node | null | undefined): node is E.JSXElement | E.JSXFragment => (
    node?.type === 'JSXElement' || node?.type === 'JSXFragment'
);

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

/** Whether `source` still reads the `args` parameter, so the snippet has to keep declaring it. */
function readsArgs(source: string): boolean {
    // A key or a member name spelled `args` names a property, not the parameter.
    const named = new Set<Node>();
    let reads = false;

    walk(parseModule(source).program, (node) => {
        if (node.type === 'MemberExpression' && !node.computed) {
            named.add(node.property);
        }

        if (node.type === 'Property' && !node.computed && !node.shorthand) {
            named.add(node.key);
        }

        if (node.type === 'Identifier' && node.name === 'args' && !named.has(node)) {
            reads = true;
        }
    });

    return reads;
}

type ValuePrinter = (node: Node) => string;

/** Prints an arg value for a snippet line indented by `indent`. */
const valuePrinter = (indent: string): ValuePrinter => node => reindent(detachedTextOf(node), '', indent);

const isValidJsxAttrName = (n: string) => /^[A-Z_][\w:-]*$/i.test(n);

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

/** Attributes for every arg not already set by name, with invalid names collected in one spread. */
function injectedAttributes(merged: Args, existing: ReadonlySet<string>, print: ValuePrinter): string[] {
    const entries = Object.entries(merged).filter(
        ([k]) => k !== 'children' && !existing.has(k)
    );
    const attrs = entries.filter(([k]) => isValidJsxAttrName(k)).map(([k, v]) => toAttr(k, v, print));
    const invalid = entries.filter(([k]) => !isValidJsxAttrName(k));

    if (invalid.length > 0) {
        const members = invalid.map(([k, v]) => `${ JSON.stringify(k) }: ${ print(v) }`);

        attrs.push(`{...{ ${ members.join(', ') } }}`);
    }

    return attrs;
}

/** JSX children for a `children` arg, or `undefined` when there is none. */
function toJsxChildren(node: Node | undefined, print: ValuePrinter): string | undefined {
    if (!node) {
        return undefined;
    }

    // JSX text cannot hold braces or tags, decodes entities and folds line breaks.
    if (isStringLiteral(node) && !/[{}<>&\r\n]/.test(node.value)) {
        return node.value;
    }

    return isJsx(node) ? print(node) : `{${ print(node) }}`;
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
    const printAt = (offset: number) => valuePrinter(lineIndent(code, offset));

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
            const pieces = injectedAttributes(merged, existing, printAt(attrs[firstSpread]!.start)).join(' ');

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
                ? toJsxChildren(merged['children'], printAt(opening.start))
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

            if (key !== null && Object.hasOwn(merged, key)) {
                edits.push({ start: a.start, end: a.end, text: toAttr(a.name.name, merged[key]!, printAt(a.start)) });
                changed = true;
            }
        }
    }

    for (const child of node.children) {
        if (isJsx(child)) {
            changed = rewriteJsx(code, child, merged, edits) || changed;
        }
        else if (child.type === 'JSXExpressionContainer' && getArgsMemberKey(child.expression) === 'children') {
            const children = toJsxChildren(merged['children'], printAt(child.start));

            if (children !== undefined) {
                edits.push({ start: child.start, end: child.end, text: children });
                changed = true;
            }
        }
    }

    return changed;
}
