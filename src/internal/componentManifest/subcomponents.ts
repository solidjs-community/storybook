import { extractDeclaredSubcomponents as extractCoreDeclaredSubcomponents } from 'storybook/internal/common';

import type { CsfFile } from 'storybook/internal/csf-tools';

export type DeclaredSubcomponent = {
	name: string;
	componentName: string;
};

/**
 * `meta.subcomponents` as core reads it. Only the names are kept: `getComponents` resolves them to
 * files, because core's meta-component resolver does not follow `import X = require()`.
 */
export function extractDeclaredSubcomponents(csf: CsfFile): DeclaredSubcomponent[] {
	return extractCoreDeclaredSubcomponents(csf).map(({ name, componentName }) => ({ name, componentName }));
}
