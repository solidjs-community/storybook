import * as path from 'node:path';

import type ts from '@typescript/typescript6';

const TS_CONFIG_NAMES = ['tsconfig.json', 'jsconfig.json'];

function normalizePath(filePath: string) {
	return path.resolve(filePath).replace(/\\/g, '/');
}

function collectTsConfigCandidates(typescript: typeof ts, filePath: string) {
	const candidates: string[] = [];
	let dir = path.dirname(path.resolve(filePath));

	while (true) {
		for (const name of TS_CONFIG_NAMES) {
			const candidate = path.join(dir, name);

			if (typescript.sys.fileExists(candidate)) {
				candidates.push(candidate.replace(/\\/g, '/'));
			}
		}

		const parent = path.dirname(dir);

		if (parent === dir) {
			break;
		}

		dir = parent;
	}

	return candidates;
}

function commandLineIncludesFile(commandLine: ts.ParsedCommandLine, filePath: string) {
	const normalized = normalizePath(filePath);

	return commandLine.fileNames.some(name => normalizePath(name) === normalized);
}

function parseTsConfig(typescript: typeof ts, tsconfigPath: string) {
	const config = typescript.readConfigFile(tsconfigPath, typescript.sys.readFile);

	if (config.error) {
		return undefined;
	}

	return typescript.parseJsonConfigFileContent(
		config.config,
		typescript.sys,
		path.dirname(tsconfigPath),
		{},
		tsconfigPath
	);
}

function resolveReferencePath(typescript: typeof ts, ref: ts.ProjectReference) {
	const resolved = typescript.resolveProjectReferencePath(ref);

	if (typescript.sys.fileExists(resolved)) {
		return resolved.replace(/\\/g, '/');
	}

	if (typescript.sys.directoryExists?.(resolved)) {
		for (const name of TS_CONFIG_NAMES) {
			const nested = path.join(resolved, name);

			if (typescript.sys.fileExists(nested)) {
				return nested.replace(/\\/g, '/');
			}
		}
	}

	return resolved.replace(/\\/g, '/');
}

function findMatchingConfig(
	typescript: typeof ts,
	tsconfigPath: string,
	filePath: string,
	visited: Set<string>
): string | null {
	const normalizedConfig = tsconfigPath.replace(/\\/g, '/');

	if (visited.has(normalizedConfig)) {
		return null;
	}

	visited.add(normalizedConfig);

	const commandLine = parseTsConfig(typescript, tsconfigPath);

	if (!commandLine) {
		return null;
	}

	if (commandLineIncludesFile(commandLine, filePath)) {
		return normalizedConfig;
	}

	for (const ref of commandLine.projectReferences ?? []) {
		const refPath = resolveReferencePath(typescript, ref);
		const match = findMatchingConfig(typescript, refPath, filePath, visited);

		if (match) {
			return match;
		}
	}

	return null;
}

export function findTsConfigForFile(typescript: typeof ts, filePath: string): string | null {
	const candidates = collectTsConfigCandidates(typescript, filePath);

	for (const candidate of candidates) {
		const match = findMatchingConfig(typescript, candidate, filePath, new Set());

		if (match) {
			return match;
		}
	}

	return candidates[0] ?? null;
}
