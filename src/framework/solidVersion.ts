import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import semver from 'semver';

import type { FrameworkConfig, FrameworkOptions, SolidVersion } from './types';

const ENTRY_PREVIEW_PATHS: Record<SolidVersion, string> = {
    1: 'storybook-solidjs-vite/renderer/entry-preview-v1',
    2: '',
};

function getFrameworkOptions(framework: FrameworkConfig): FrameworkOptions {
    return typeof framework === 'string' ? {} : (framework.options ?? {});
}

/**
 * Resolves the Solid major version to use.
 * Explicit `framework.options.solidVersion` wins; otherwise reads installed `solid-js`.
 */
export function resolveSolidVersion(
    framework: FrameworkConfig,
    configDir: string
): SolidVersion {
    const { solidVersion } = getFrameworkOptions(framework);

    if (solidVersion === 1 || solidVersion === 2) {
        return solidVersion;
    }

    return detectSolidVersionFromInstalled(configDir);
}


/** Resolves modules from the Storybook consumer project (next to `.storybook/main`). */
function createProjectRequire(configDir: string) {
    for (const file of ['main.ts', 'main.js', 'main.mjs', 'main.cjs']) {
        const configFile = join(configDir, file);

        if (existsSync(configFile)) {
            return createRequire(configFile);
        }
    }

    return createRequire(join(configDir, 'package.json'));
}

function detectSolidVersionFromInstalled(configDir: string): SolidVersion {
    const projectRequire = createProjectRequire(configDir);

    let pkgPath: string;

    try {
        pkgPath = projectRequire.resolve('solid-js/package.json');
    }
    catch {
        throw new Error(
            'Could not detect Solid version: `solid-js` is not installed. '
            + 'Install it or set `framework.options.solidVersion` in `.storybook/main.ts`.'
        );
    }

    const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };

    return semver.major(version ?? '1.9.0') as SolidVersion;
}


/**
 * Storybook entry-preview module id for the given Solid major version.
 * v2 path will be added when a `renderer/v2` implementation ships.
 */
export function resolveEntryPreviewPath(solidVersion: SolidVersion): string {
    if (!ENTRY_PREVIEW_PATHS[solidVersion]) {
        throw new Error(
            `Solid ${ solidVersion } renderer is not available yet.`
        );
    }

    return ENTRY_PREVIEW_PATHS[solidVersion];
}
