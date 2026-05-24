import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import semver from 'semver';

import type { FrameworkConfig, SolidVersion } from './types';

function getFrameworkName(framework: FrameworkConfig): string {
    return typeof framework === 'string' ? framework : framework.name;
}

function detectInstalledSolidVersion(configDir: string): SolidVersion {
    const projectRequire = createRequire(join(configDir, 'package.json'));

    let pkgPath: string;

    try {
        pkgPath = projectRequire.resolve('solid-js/package.json');
    }
    catch {
        throw new Error('Could not detect Solid version: `solid-js` is not installed.');
    }

    const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };

    return semver.major(version ?? '1.9.0') as SolidVersion;
}

/**
 * Resolves the Solid major version for the Storybook renderer.
 *
 * - `storybook-solidjs-vite/next` → Solid 2
 * - `storybook-solidjs-vite` → detected from installed `solid-js`
 */
export function resolveSolidVersion(
    framework: FrameworkConfig,
    configDir: string
): SolidVersion {
    const name = getFrameworkName(framework);

    if (name === 'storybook-solidjs-vite/next') {
        return 2;
    }

    return detectInstalledSolidVersion(configDir);
}

/** Force a single copy of Solid packages (renderer + app + linked deps). */
export const SOLID_DEDUPE_PACKAGES = [
    'solid-js',
    '@solidjs/web',
    '@solidjs/signals',
    '@solidjs/router',
    '@solidjs/meta',
] as const;

export function mergeSolidDedupe(existing?: string | readonly string[]): string[] {
    const base = existing == null ? [] : [...existing];

    return [...new Set([...base, ...SOLID_DEDUPE_PACKAGES])];
}
