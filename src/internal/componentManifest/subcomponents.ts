import { isStringLiteral, unwrapExpression } from 'storybook/internal/csf-tools';

import type { CsfFile, ESTree, ESTreeNode } from 'storybook/internal/csf-tools';

export type DeclaredSubcomponent = {
	name: string;
	componentName: string;
};

export function extractDeclaredSubcomponents(csf: CsfFile): DeclaredSubcomponent[] {
	const rawSubcomponents = unwrapSubcomponentNode(
		csf._metaAnnotations['subcomponents'],
		csf._program
	);

	if (rawSubcomponents?.type !== 'ObjectExpression') {
		return [];
	}

	return rawSubcomponents.properties.flatMap((property) => {
		if (property.type !== 'Property' || property.method || property.kind !== 'init') {
			return [];
		}

		const name = getObjectKeyName(property.key);
		const directComponentName = getComponentExpressionName(property.value);
		const componentExpression = unwrapSubcomponentNode(property.value, csf._program);
		const componentName = getComponentExpressionName(componentExpression) ?? directComponentName;

		return name && componentName ? [{ name, componentName }] : [];
	});
}

function findVariableInitialization(identifier: string, program: ESTree.Program) {
	for (const node of program.body) {
		const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;

		if (declaration?.type !== 'VariableDeclaration') {
			continue;
		}

		const declarator = declaration.declarations.find(
			decl => decl.id.type === 'Identifier' && decl.id.name === identifier
		);

		if (declarator?.init) {
			return declarator.init;
		}
	}

	return undefined;
}

function unwrapSubcomponentNode(
	node: ESTreeNode | undefined,
	program: ESTree.Program,
	visitedIdentifiers = new Set<string>()
): ESTreeNode | undefined {
	let current = node;

	while (current) {
		if (current.type === 'Identifier') {
			if (visitedIdentifiers.has(current.name)) {
				return undefined;
			}

			visitedIdentifiers.add(current.name);
			current = findVariableInitialization(current.name, program);
			continue;
		}

		// The parser drops parentheses, so only the TS wrappers are left to peel.
		const unwrapped = unwrapExpression(current);

		if (unwrapped !== current) {
			current = unwrapped;
			continue;
		}

		return current;
	}

	return undefined;
}

function getObjectKeyName(key: ESTreeNode) {
	if (key.type === 'Identifier') {
		return key.name;
	}

	if (isStringLiteral(key)) {
		return key.value;
	}

	return undefined;
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
