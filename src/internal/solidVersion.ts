import { major } from 'semver';
import { getVersionSafe } from 'storybook/internal/cli';
import { JsPackageManagerFactory } from 'storybook/internal/common';

export type SolidVersion = 1 | 2;

export type SolidRendererId = 'solid' | 'solid-next';

/** Resolves the Solid major version from the project's installed `solid-js`. */
export async function resolveSolidVersion(configDir: string): Promise<SolidVersion> {
    const packageManager = JsPackageManagerFactory.getPackageManager({ configDir });
    const version = await getVersionSafe(packageManager, 'solid-js');

    if (!version) {
        throw new Error('Could not detect Solid version: `solid-js` is not installed.');
    }

    return major(version) as SolidVersion;
}

export function resolveSolidRendererEntry(solidVersion: SolidVersion): string {
    return solidVersion === 2
        ? 'storybook-solidjs-vite/renderer/solid-next'
        : 'storybook-solidjs-vite/renderer/solid-legacy';
}
