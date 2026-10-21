import { resolveIdentifierInit, staticKey, unwrapExpression } from 'storybook/internal/csf-tools';

import type { CsfFile, ESTree, ESTreeNode } from 'storybook/internal/csf-tools';

export type DeclaredSubcomponent = {
	name: string;
	componentName: string;
};

export function extractDeclaredSubcomponents(csf: CsfFile): DeclaredSubcomponent[] {
	const rawSubcomponents = resolveLocalValue(csf._metaAnnotations['subcomponents'], csf.program);

	if (rawSubcomponents?.type !== 'ObjectExpression') {
		return [];
	}

	return rawSubcomponents.properties.flatMap((property) => {
		if (property.type !== 'Property' || property.method || property.kind !== 'init') {
			return [];
		}

		const name = staticKey(property);
		const componentName = getComponentExpressionName(resolveLocalValue(property.value, csf.program))
			?? getComponentExpressionName(property.value);

		return name && componentName ? [{ name, componentName }] : [];
	});
}

/**
 * The expression a chain of local declarations and TS wrappers leads to, or `undefined` when the
 * chain leaves the file or loops.
 */
function resolveLocalValue(node: ESTreeNode | undefined, program: ESTree.Program): ESTreeNode | undefined {
	const visited = new Set<string>();
	let current = unwrapExpression(node);

	while (current?.type === 'Identifier') {
		if (visited.has(current.name)) {
			return undefined;
		}

		visited.add(current.name);
		current = unwrapExpression(resolveIdentifierInit(program, current.name) ?? undefined);
	}

	return current;
}

function getComponentExpressionName(node: ESTreeNode | undefined): string | undefined {
	if (!node) {
		return undefined;
	}

	if (node.type === 'Identifier') {
		return node.name;
	}

	if (node.type === 'MemberExpression' && !node.computed) {
		const objectName = getComponentExpressionName(node.object);
		const propertyName = getComponentExpressionName(node.property);

		return objectName && propertyName ? `${ objectName }.${ propertyName }` : undefined;
	}

	return undefined;
}
