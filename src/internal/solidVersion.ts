import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import semver from 'semver';

type SolidVersion = 1 | 2;

function getFrameworkName(framework: string | { name: string }): string {
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
    framework: string | { name: string },
    configDir: string
): SolidVersion {
    const name = getFrameworkName(framework);

    if (name.endsWith('/next')) {
        return 2;
    }

    return detectInstalledSolidVersion(configDir);
}
