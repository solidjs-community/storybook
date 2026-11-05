import ts from '@typescript/typescript6';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	createLazyDocgenMiddleware,
	extractDeclaredSubcomponents,
	getComponentIdFromEntry,
	getStoryImportPathFromEntry,
} from 'storybook/internal/common';
import {
	buildImportStatements,
	extractComponentDescription,
	extractDescription,
	loadCsf,
	storyShapeError,
} from 'storybook/internal/csf-tools';

import { collectCsfArgNames } from '../collectCsfArgNames';
import {
	findExactComponentMatch,
	findMatchingComponent,
	getComponents,
	getFallbackImport,
	getImportablePackageName,
} from '../getComponents';
import { SolidComponentMetaManager } from '../solidComponentMeta/SolidComponentMetaManager';
import { solidComponentDocToArgTypesData } from '../toDocgenInfo';

import type { CsfFile } from 'storybook/internal/csf-tools';
import type {
	DocgenError,
	DocgenPayload,
	DocgenProviderInput,
	DocgenSubcomponent,
} from 'storybook/internal/types';
import type { ComponentRef, SolidComponentDoc } from '../types';

function readEntry(entry: DocgenProviderInput['entry']) {
	const importPath = getStoryImportPathFromEntry(entry);
	const title = entry.title || 'Component';
	const id = getComponentIdFromEntry(entry);

	return { importPath, title, id };
}

/**
 * A subcomponent's import, as React builds it: by the package name of the documented component
 * when that package is importable, else as the story imports it.
 */
function subcomponentImport(component: ComponentRef, packageName: string | undefined) {
	return buildImportStatements({ refs: [component], ...(packageName ? { packageName } : {}) })
		.join('\n')
		.trim() || getFallbackImport(packageName, component.componentName);
}

function docPayload(
	doc: SolidComponentDoc | undefined,
	component: ComponentRef | undefined,
	options: { metaJsDoc?: string | undefined; name?: string; sourceImport?: string } = {}
): DocgenSubcomponent | undefined {
	const { metaJsDoc, sourceImport } = options;
	const name = options.name ?? component?.componentName ?? doc?.exportName;
	const path = component?.path ?? doc?.filePath;

	if (!name || !path) {
		return undefined;
	}

	const argTypes = doc ? solidComponentDocToArgTypesData(doc) : undefined;
	// Same precedence as React: the meta docblock wins over the component's own JSDoc.
	const { description, summary, jsDocTags } = extractComponentDescription(
		metaJsDoc,
		doc?.description,
		component?.componentJsDocTags ?? doc?.jsDocTags
	);

	return {
		name,
		path,
		jsDocTags,
		...(sourceImport ? { import: sourceImport } : {}),
		...(description ? { description } : {}),
		...(summary ? { summary } : {}),
		...(argTypes ? { argTypes } : {}),
		...(doc ? { reactComponentMeta: doc } : {}),
	};
}

/** React's `error` payload for a story file whose component cannot be documented. */
function missingComponentPayload(options: {
	id: string;
	title: string;
	storyFilePath: string;
	storyFile: string;
	csf: CsfFile;
}): DocgenPayload {
	const { id, title, storyFilePath, storyFile, csf } = options;
	const componentName = csf._meta?.component;
	const error: DocgenError = componentName
		? {
			name: 'No component import found',
			message: `No component file found for the "${ componentName }" component.`,
		}
		: {
			name: 'No component found',
			message: 'We could not detect the component from your story file. Specify meta.component.',
		};
	const message = csf._metaStatement
		? storyShapeError(error.message, csf._metaStatement, csf.editor).message
		: error.message;

	return {
		id,
		name: componentName ?? title.split('/').at(-1)!.replace(/\s+/g, ''),
		path: storyFilePath,
		jsDocTags: {},
		error: {
			name: error.name,
			message: `${ message }\n\n${ storyFilePath }:\n${ storyFile }`,
		},
	};
}

function missingSubcomponentPayload(declaredName: string, storyFilePath: string): DocgenSubcomponent {
	return {
		name: declaredName,
		path: storyFilePath,
		jsDocTags: {},
		error: {
			name: 'No component import found',
			message: `No component file found for the "${ declaredName }" subcomponent.`,
		},
	};
}

export async function extractDocgen(
	manager: SolidComponentMetaManager,
	input: DocgenProviderInput
): Promise<DocgenPayload | undefined> {
	const { importPath, title, id } = readEntry(input.entry);

	if (!importPath) {
		return undefined;
	}

	const storyPath = join(process.cwd(), importPath);
	const storyFile = readFileSync(storyPath, 'utf8');
	const csf = loadCsf(storyFile, { makeTitle: () => title, fileName: storyPath }).parse();
	const declaredSubcomponents = extractDeclaredSubcomponents(csf);
	const allComponents = await getComponents({
		csf,
		storyFilePath: storyPath,
		additionalComponentNames: declaredSubcomponents.map(subcomponent => subcomponent.componentName),
	});
	const component = findMatchingComponent(allComponents, csf._meta?.component, title);
	const referencedArgNames = collectCsfArgNames(csf);

	if (component?.path && component.importName) {
		const extracted = manager.extractFromComponentFile(
			component.path,
			component.member ?? component.importName,
			referencedArgNames
		);

		if (extracted) {
			component.reactComponentMeta = extracted;
		}
	}

	const doc = component?.reactComponentMeta;
	const metaJsDoc = extractDescription(csf._metaStatement, csf.editor) || undefined;
	// Like React, the component itself carries no `import`: story docs serve the file's import block.
	const ours = doc ? docPayload(doc, component, { metaJsDoc }) : undefined;

	if (!ours) {
		return missingComponentPayload({ id, title, storyFilePath: importPath, storyFile, csf });
	}

	const packageName = declaredSubcomponents.length > 0
		? getImportablePackageName(component?.path, storyPath)
		: undefined;
	const subcomponents = Object.fromEntries(
		declaredSubcomponents.flatMap((declared) => {
			const resolved = findExactComponentMatch(allComponents, declared.componentName);

			if (!resolved) {
				return [[declared.name, missingSubcomponentPayload(declared.name, importPath)]];
			}

			if (!resolved.path || !resolved.importName) {
				return [];
			}

			const extracted = manager.extractFromComponentFile(
				resolved.path,
				resolved.member ?? resolved.importName
			);

			if (extracted) {
				resolved.reactComponentMeta = extracted;
			}

			// Named by the declared key, like React: `{ Header: Card.Header }` documents `Header`.
			const payload = docPayload(resolved.reactComponentMeta, resolved, {
				name: declared.name,
				sourceImport: subcomponentImport(resolved, packageName),
			});

			return payload ? [[declared.name, payload]] : [];
		})
	);

	return {
		id,
		...ours,
		// Core's contract: the payload `path` is the story file, not the component file.
		path: importPath,
		...(Object.keys(subcomponents).length > 0 ? { subcomponents } : {}),
	};
}

export function createDocgenProvider() {
	return createLazyDocgenMiddleware({
		createManager: async() => new SolidComponentMetaManager(ts),
		extract: async(manager, input) => {
			try {
				return await extractDocgen(manager, input);
			}
			catch {
				return undefined;
			}
		},
	});
}
