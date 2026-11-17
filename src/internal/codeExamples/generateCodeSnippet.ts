import {
    collectImportBindings,
    createStoryArgsResolver,
    detachedTextOf,
    isCanonicalCsf2BindCall,
    isStringLiteral,
    lineIndent,
    metaObject,
    normalizeStoryDeclaration,
    reindent,
    resolveRenderFunction,
    SourceEditor,
    storyShapeError,
    textOf,
    walk,
} from 'storybook/internal/csf-tools';
import { createHoleMarks, stripHoles, withHoleSpace } from 'storybook/internal/docs-tools';

import { invariant } from './invariant';
import { printAttribute, printAttributes, printChildren } from './snippet-values';

import type {
    CsfFile,
    ESTree as E,
    FunctionNode,
    ImportRef,
    ESTreeNode as Node,
    RenderResolution,
    StoryArgsResolver,
} from 'storybook/internal/csf-tools';
import type { SnippetTemplate } from 'storybook/internal/docs-tools';
import type { JsxValue, Mark, SolidHolePlace } from './snippet-values';

type Args = Record<string, Node>;

/** A text edit of the story file, addressed by offsets into its code. */
interface Edit {
    start: number;
    end: number;
    text: string;
}

/** A story's snippet, and what showing it as a complete example still depends on. */
export interface CodeSnippet {
    /** Source of a `const` or `function` declaration named after the story. */
    snippet: string;
    /** The snippet with each place an arg prints as a hole; see `StoryDoc`. */
    template: SnippetTemplate<SolidHolePlace>;
    /** Imports the snippet needs beyond the component, from arg values that kept a name. */
    imports: ImportRef[];
    /** What a static pass could not read, in the source text it was written as. */
    unresolved: string[];
}

/**
 * Source of a `const` or `function` declaration, named after the story, that shows how to render
 * it: the story's own function or `render`, with the args it reads inlined, or the component with
 * the story's args as attributes. Arg values that still name something the snippet does not hold
 * are listed in `imports` or `unresolved`.
 *
 * The snippet is printed once, with each place an arg prints marked by a comment, which parses and
 * reindents wherever the place stands. The marks become the template's holes, and the template
 * without them is the snippet.
 */
export function getCodeSnippet(
    csf: CsfFile,
    storyName: string,
    componentName?: string,
    resolver: StoryArgsResolver = createStoryArgsResolver(csf)
): CodeSnippet {
    const { args, imports, unresolved } = resolver.resolve(storyName);
    const importedBind = importedBoundStory(csf, storyName, args);
    // All code the snippet prints, so none of it is read as a mark.
    const sources = [csf.editor.code, ...Object.values(args).map(detachedTextOf)];
    const marks = createHoleMarks<SolidHolePlace>(sources, mark => `/*${ mark }*/`);
    const marked = importedBind
        ? importedBind.print(marks.mark)
        : buildSnippet(csf, storyName, componentName, args, resolver, marks.mark);
    const holes = marks.toTemplate(marked);

    invariant(holes, 'A place an arg prints was printed inside another.');

    // An attribute a control clears leaves no gap or empty line.
    const template = withHoleSpace(holes, hole => hole.kind === 'attr');

    return {
        snippet: stripHoles(template),
        template,
        imports: importedBind ? [...imports, importedBind.importRef] : imports,
        unresolved,
    };
}

/** `Template.bind({})` of an imported `Template`: the snippet calls the bound template with the args. */
function importedBoundStory(csf: CsfFile, storyName: string, args: Args) {
    const declaration = csf._storyExports[storyName];

    if (declaration?.type !== 'VariableDeclarator' || !isCanonicalCsf2BindCall(declaration.init)) {
        return undefined;
    }

    const local = declaration.init.callee.object.name;
    const binding = collectImportBindings(csf.program).get(local);

    if (!binding) {
        return undefined;
    }

    const print = valuePrinter('    ');
    const bound = textOf(declaration.init);
    // Each value the story writes is a hole for its arg.
    const argsObject = (mark: Mark) => {
        const members = Object.entries(args).map(
            ([key, value]) => `    ${ JSON.stringify(key) }: ${ mark({ kind: 'value', arg: key }, print(value)) }`
        );

        return members.length > 0 ? `{\n${ members.join(',\n') }\n}` : '{}';
    };
    const importRef: ImportRef = {
        localImportName: local,
        importId: binding.importId,
        importName: binding.importName,
        ...(binding.importName === '*' ? { namespace: local } : {}),
    };

    return { print: (mark: Mark) => `const ${ storyName } = () => ${ bound }(${ argsObject(mark) });`, importRef };
}

function buildSnippet(
    csf: CsfFile,
    storyName: string,
    componentName: string | undefined,
    args: Args,
    resolver: StoryArgsResolver,
    mark: Mark
): string {
    const editor = csf.editor;
    const declaration = csf._storyExports[storyName];

    if (!declaration) {
        const message = 'Expected story to be a function or variable declaration';
        const statement = csf.program.body.find(
            node => node.type === 'ExportNamedDeclaration'
                && node.specifiers.some(
                    specifier => (specifier.exported.type === 'Identifier' ? specifier.exported.name : specifier.exported.value) === storyName
                )
        );

        throw statement ? storyShapeError(message, statement, editor) : message;
    }

    const story = normalizeStoryDeclaration(declaration, editor);
    const metaRender = resolveRenderFunction(metaObject(csf), editor, resolver.ctx);
    const storyRender = resolveRenderFunction(story.type === 'config' ? story.node : undefined, editor, resolver.ctx);
    // A story whose `render` cannot be read does not fall back to the meta's, which it overrides.
    const storyFn = story.type === 'fn'
        ? story.node
        : renderFunctionOf(storyRender) ?? (storyRender.kind === 'missing' ? renderFunctionOf(metaRender) : undefined);

    if (storyFn) {
        return functionSnippet(editor, storyName, storyFn, args, mark);
    }

    invariant(componentName, 'Could not generate snippet without component name.');

    const print = valuePrinter('');
    const attrs = injectedAttributes(args, new Set(), print, mark);
    const added = addedAttributes(injectedNames(args, new Set()), Boolean(args['children']), mark);
    const opening = `<${ [componentName, ...attrs].join(' ') }${ added }`;
    const element = args['children']
        ? `${ opening }>${ childrenHole(args['children'], print, mark) }</${ componentName }>`
        : `${ opening } />`;

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
function functionSnippet(editor: SourceEditor, storyName: string, fn: FunctionNode, merged: Args, mark: Mark): string {
    const { code } = editor;
    const asyncPrefix = fn.async ? 'async ' : '';
    const functionKeyword = `${ asyncPrefix }function${ fn.generator ? '*' : '' }`;
    const params = fn.params.length > 0 ? code.slice(fn.params[0]!.start, fn.params.at(-1)!.end) : '';
    const edits: Edit[] = [];

    if (fn.type === 'ArrowFunctionExpression' && isJsx(fn.body)) {
        if (rewriteJsx(code, fn.body, merged, edits, mark)) {
            const body = printRange(code, fn.body, edits);
            const kept = readParams(code, fn, `${ asyncPrefix }(${ params }) => (${ body });`);

            return `const ${ storyName } = ${ asyncPrefix }(${ kept }) => ${ body };`;
        }
    }
    else if (fn.body?.type === 'BlockStatement') {
        let changed = false;

        for (const statement of fn.body.body) {
            if (statement.type === 'ReturnStatement' && isJsx(statement.argument)) {
                changed = rewriteJsx(code, statement.argument, merged, edits, mark) || changed;
            }
        }

        if (changed) {
            const body = printRange(code, fn.body, edits);
            const kept = readParams(code, fn, `${ functionKeyword } f(${ params }) ${ body }`);

            return fn.type === 'FunctionDeclaration'
                ? `${ functionKeyword } ${ storyName }(${ kept }) ${ body }`
                : `const ${ storyName } = ${ asyncPrefix }(${ kept }) => ${ body };`;
        }
    }

    // The story as written, but for the reads of args it does not set, which are marked.
    if (fn.type === 'FunctionDeclaration' && fn.body) {
        return `${ functionKeyword } ${ storyName }(${ params }) ${ printRange(code, fn.body, edits) }`;
    }

    // A method's source starts at its parameters, so it is printed as an arrow function.
    if (isMethod(editor.parentOf(fn)) && fn.body) {
        return `const ${ storyName } = ${ asyncPrefix }(${ params }) => ${ printRange(code, fn.body, edits) };`;
    }

    return `const ${ storyName } = ${ printRange(code, fn, edits) };`;
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

/**
 * The parameters of `fn` that `source`, the rewritten function, still reads. A parameter keeps its
 * position, so every parameter before the last one read stays as written.
 */
function readParams(code: string, fn: FunctionNode, source: string): string {
    const editor = new SourceEditor(source);
    const statement = editor.program.body[0];
    const rewritten = (statement?.type === 'ExpressionStatement' ? statement.expression : statement) as FunctionNode;
    const read = rewritten.params.findLastIndex((param) => {
        let reads = false;

        walk(param, (node) => {
            if (node.type === 'Identifier' && (editor.scopes.bindingOf(node)?.references.length ?? 0) > 0) {
                reads = true;
            }
        });

        return reads;
    });

    return read === -1 ? '' : code.slice(fn.params[0]!.start, fn.params[read]!.end);
}

type ValuePrinter = (node: Node) => string;

/** Prints an arg value for a snippet line indented by `indent`. */
const valuePrinter = (indent: string): ValuePrinter => node => reindent(detachedTextOf(node), '', indent);

/** An arg's node as the shared printers read it, its code printed by `print`. */
function toJsxValue(node: Node, print: ValuePrinter): JsxValue {
    if (node.type === 'Literal' && typeof node.value === 'boolean') {
        return { kind: 'boolean', value: node.value };
    }

    if (isStringLiteral(node)) {
        return { kind: 'string', value: node.value, code: print(node) };
    }

    return { kind: isJsx(node) ? 'jsx' : 'code', code: print(node) };
}

const toAttr = (key: string, value: Node, print: ValuePrinter) => printAttribute(key, toJsxValue(value, print));

/** The args an element gets as attributes: every one it does not set by name, but `children`. */
const injectedArgs = (merged: Args, existing: ReadonlySet<string>) => Object.entries(merged).filter(
    ([k]) => k !== 'children' && !existing.has(k)
);

const injectedNames = (merged: Args, existing: ReadonlySet<string>) => injectedArgs(merged, existing).map(([k]) => k);

/** Attributes for every arg not already set by name, with invalid names collected in one spread. */
const injectedAttributes = (merged: Args, existing: ReadonlySet<string>, print: ValuePrinter, mark: Mark) => printAttributes(
    injectedArgs(merged, existing).map(([k, v]) => [k, toJsxValue(v, print)]),
    mark
);

/**
 * Where a spread passes the args a control sets, but those the element prints already: by name, or
 * `children` where it has content.
 */
const addedAttributes = (printed: string[], hasContent: boolean, mark: Mark) => mark(
    { kind: 'attrs', spread: true, except: hasContent ? [...printed, 'children'] : printed },
    ''
);

/** The `children` arg as content, in a hole for it. */
const childrenHole = (node: Node, print: ValuePrinter, mark: Mark) => (
    mark({ kind: 'text', arg: 'children' }, toJsxChildren(node, print))
);

/** JSX children for an arg value, or `''` when there is none. */
const toJsxChildren = (node: Node | undefined, print: ValuePrinter) => (node ? printChildren(toJsxValue(node, print)) : '');

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
 * An offset on the line that text inserted at `offset` lands on once `edits` apply: an edit that
 * removes a line break before it on its line pulls it up to the line the edit starts on.
 */
function landingOffset(code: string, offset: number, edits: Edit[]): number {
    let anchor = offset;
    let joined: Edit | undefined;

    do {
        const lineStart = code.lastIndexOf('\n', anchor - 1) + 1;

        joined = edits.find(edit => !edit.text.includes('\n') && edit.start < lineStart && edit.end >= lineStart && edit.end <= anchor);
        anchor = joined?.start ?? anchor;
    } while (joined);

    return anchor;
}

/**
 * Records the edits that expand `{...args}` into the merged args and inline `args.foo` reads, and
 * returns whether there were any. A read of an arg the story does not set is kept as written, and
 * only marked.
 */
/** An attribute's name as written, with Solid's namespace (`use:tooltip`); `null` for a spread. */
function attributeName(a: Node): string | null {
    if (a.type !== 'JSXAttribute') {
        return null;
    }

    return a.name.type === 'JSXNamespacedName' ? `${ a.name.namespace.name }:${ a.name.name.name }` : a.name.name;
}

function rewriteJsx(
    code: string,
    node: E.JSXElement | E.JSXFragment,
    merged: Args,
    edits: Edit[],
    mark: Mark
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
                attrs.flatMap(a => attributeName(a) ?? [])
            );
            const injected = injectedNames(merged, existing);
            const pieces = injectedAttributes(merged, existing, printAt(attrs[firstSpread]!.start), mark).join(' ')
                + addedAttributes([...existing, ...injected], Boolean(merged['children']) || node.children.length > 0, mark);

            // The args go where the first spread was; later spreads are dropped.
            attrs.forEach((a, index) => {
                if (!isArgsSpread(a)) {
                    return;
                }

                if (index === firstSpread && injected.length > 0) {
                    edits.push({ start: a.start, end: a.end, text: pieces });
                }
                else {
                    const start = index > 0 ? attrs[index - 1]!.end : tagEnd;

                    edits.push({ start, end: a.end, text: index === firstSpread ? pieces : '' });
                }
            });

            // The `children` arg the story sets is the content of an element that has none. It goes
            // after the last attribute of a self-closing tag, or after the `>`.
            if (node.children.length === 0 && merged['children']) {
                const insertAt = opening.selfClosing ? attrs.at(-1)?.end ?? tagEnd : opening.end;
                const children = childrenHole(merged['children'], printAt(landingOffset(code, insertAt, edits)), mark);

                if (opening.selfClosing) {
                    const name = code.slice(opening.name.start, opening.name.end);

                    edits.push({ start: insertAt, end: opening.end, text: `>${ children }</${ name }>` });
                }
                else {
                    edits.push({ start: opening.end, end: opening.end, text: children });
                }
            }
        }

        // Each attribute that reads an arg is a hole for it. A spread writes over the attributes
        // before it, so each of those is a hole for the arg it names, which the spread then leaves
        // out, and prints that arg where the story sets it.
        const lastSpread = attrs.findLastIndex(isArgsSpread);

        attrs.forEach((a, index) => {
            const name = attributeName(a);

            if (a.type !== 'JSXAttribute' || name === null) {
                return;
            }

            const key = a.value?.type === 'JSXExpressionContainer' ? getArgsMemberKey(a.value.expression) : null;
            const arg = index < lastSpread ? name : key;

            if (arg === null) {
                return;
            }

            const read = [arg, key].find((k): k is string => k !== null && Object.hasOwn(merged, k));
            const text = read === undefined ? code.slice(a.start, a.end) : toAttr(name, merged[read]!, printAt(a.start));

            edits.push({
                start: a.start,
                end: a.end,
                text: mark({ kind: 'attr', arg, ...(arg !== name && { name }) }, text),
            });
            changed ||= read !== undefined;
        });
    }

    for (const child of node.children) {
        if (isJsx(child)) {
            changed = rewriteJsx(code, child, merged, edits, mark) || changed;
        }
        else if (child.type === 'JSXExpressionContainer') {
            // A read of an arg the story sets is filled in; one of an arg it does not set stays as written.
            const key = getArgsMemberKey(child.expression);

            if (key === null) {
                continue;
            }

            const set = Object.hasOwn(merged, key);
            const text = set ? toJsxChildren(merged[key], printAt(child.start)) : code.slice(child.start, child.end);

            edits.push({ start: child.start, end: child.end, text: mark({ kind: 'text', arg: key }, text) });
            changed ||= set;
        }
    }

    return changed;
}
