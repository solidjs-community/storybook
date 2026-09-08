import ts from '@typescript/typescript6';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCsf } from 'storybook/internal/csf-tools';

import { findExactComponentMatch, findMatchingComponent, getComponents } from '../getComponents';
import { SolidComponentMetaManager } from '../solidComponentMeta/SolidComponentMetaManager';
import { extractDeclaredSubcomponents } from '../subcomponents';
import { solidComponentDocToArgTypesData } from '../toDocgenInfo';

import type { ComponentRef, SolidComponentDoc } from '../types';

const STORY_FILE_PATTERN = /\.(?:stories|story)\.(?:m?[jt]sx?)$/;

let manager: SolidComponentMetaManager | undefined;

function getManager() {
	manager ??= new SolidComponentMetaManager(ts);

	return manager;
}

function readEntry(input: { entry?: Record<string, unknown> } | Record<string, unknown>) {
	const entry = 'entry' in input && input.entry && typeof input.entry === 'object'
		? input.entry as Record<string, unknown>
		: input as Record<string, unknown>;

	const importPathValue = entry['importPath'];
	const storiesImports = entry['storiesImports'];
	const importPath = typeof importPathValue === 'string'
		? importPathValue
		: Array.isArray(storiesImports) && typeof storiesImports[0] === 'string'
			? storiesImports[0]
			: undefined;
	const titleValue = entry['title'];
	const title = typeof titleValue === 'string' ? titleValue : 'Component';
	const idValue = entry['id'];
	const id = typeof idValue === 'string'
		? (idValue.split('--')[0] ?? idValue)
		: title.replace(/\s+/g, '');

	return { importPath, title, id };
}

function componentImport(component: ComponentRef | undefined) {
	return component?.importId
		? `import { ${ component.importName } } from "${ component.importId }";`
		: '';
}

function docPayload(doc: SolidComponentDoc | undefined, component: ComponentRef | undefined) {
	if (!doc && !component) {
		return undefined;
	}

	return {
		name: component?.componentName ?? doc?.exportName,
		path: component?.path ?? doc?.filePath,
		import: componentImport(component),
		description: doc?.description,
		argTypes: doc ? solidComponentDocToArgTypesData(doc) : undefined,
		jsDocTags: component?.componentJsDocTags ?? {},
		reactComponentMeta: doc,
	};
}

async function extractDocgen(input: any) {
	const { importPath, title, id } = readEntry(input);

	if (!importPath || !STORY_FILE_PATTERN.test(importPath)) {
		return undefined;
	}

	const storyPath = join(process.cwd(), importPath);
	const storyFile = readFileSync(storyPath, 'utf8');
	const csf = loadCsf(storyFile, { makeTitle: () => title }).parse();
	const declaredSubcomponents = extractDeclaredSubcomponents(csf);
	const allComponents = await getComponents({
		csf: csf as Parameters<typeof getComponents>[0]['csf'],
		storyFilePath: storyPath,
		additionalComponentNames: declaredSubcomponents.map(subcomponent => subcomponent.componentName),
	});
	const component = findMatchingComponent(allComponents, csf._meta?.component, title);
	const metaManager = getManager();

	if (component?.path && component.importName) {
		const extracted = metaManager.extractFromComponentFile(
			component.path,
			component.member ?? component.importName
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

			const extracted = metaManager.extractFromComponentFile(
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
	return (next: any) => async(input: any) => {
		let ours: Record<string, unknown> | undefined;

		try {
			ours = await extractDocgen(input);
		}
		catch {
			ours = undefined;
		}

		const downstream = await next(input);

		if (!ours) {
			return downstream;
		}

		return { ...downstream, ...ours };
	};
}
