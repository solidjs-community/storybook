import ts from '@typescript/typescript6';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createLazyDocgenMiddleware, getStoryImportPathFromEntry } from 'storybook/internal/common';
import { loadCsf } from 'storybook/internal/csf-tools';

import { collectCsfArgNames } from '../collectCsfArgNames';
import { findExactComponentMatch, findMatchingComponent, getComponents } from '../getComponents';
import { SolidComponentMetaManager } from '../solidComponentMeta/SolidComponentMetaManager';
import { extractDeclaredSubcomponents } from '../subcomponents';
import { solidComponentDocToArgTypesData } from '../toDocgenInfo';

import type { DocgenPayload, DocgenProviderInput, DocgenSubcomponent } from 'storybook/internal/types';
import type { ComponentRef, SolidComponentDoc } from '../types';

function readEntry(entry: DocgenProviderInput['entry']) {
	const importPath = getStoryImportPathFromEntry(entry);
	const title = entry.title || 'Component';
	const id = entry.id.split('--')[0] || entry.id || title.replace(/\s+/g, '');

	return { importPath, title, id };
}

function componentImport(component: ComponentRef | undefined) {
	return component?.importId
		? `import { ${ component.importName } } from "${ component.importId }";`
		: '';
}

function docPayload(
	doc: SolidComponentDoc | undefined,
	component: ComponentRef | undefined
): DocgenSubcomponent | undefined {
	const name = component?.componentName ?? doc?.exportName;
	const path = component?.path ?? doc?.filePath;

	if (!name || !path) {
		return undefined;
	}

	const argTypes = doc ? solidComponentDocToArgTypesData(doc) : undefined;
	const sourceImport = componentImport(component);

	return {
		name,
		path,
		jsDocTags: component?.componentJsDocTags ?? {},
		...(sourceImport ? { import: sourceImport } : {}),
		...(doc?.description ? { description: doc.description } : {}),
		...(argTypes ? { argTypes } : {}),
		...(doc ? { reactComponentMeta: doc } : {}),
	};
}

async function extractDocgen(
	manager: SolidComponentMetaManager,
	input: DocgenProviderInput
): Promise<DocgenPayload | undefined> {
	const { importPath, title, id } = readEntry(input.entry);

	if (!importPath) {
		return undefined;
	}

	const storyPath = join(process.cwd(), importPath);
	const storyFile = readFileSync(storyPath, 'utf8');
	const csf = loadCsf(storyFile, { makeTitle: () => title }).parse();
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

	const subcomponents = Object.fromEntries(
		declaredSubcomponents.flatMap((declared) => {
			const resolved = findExactComponentMatch(allComponents, declared.componentName);

			if (!resolved?.path || !resolved.importName) {
				return [];
			}

			const extracted = manager.extractFromComponentFile(
				resolved.path,
				resolved.member ?? resolved.importName
			);

			if (extracted) {
				resolved.reactComponentMeta = extracted;
			}

			const payload = docPayload(resolved.reactComponentMeta, resolved);

			return payload ? [[declared.name, payload]] : [];
		})
	);

	const ours = docPayload(component?.reactComponentMeta, component);

	if (!ours) {
		return undefined;
	}

	return {
		id,
		...ours,
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
