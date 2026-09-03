import { major } from 'semver';
import { JsPackageManagerFactory } from 'storybook/internal/common';

import type { JsPackageManager } from 'storybook/internal/common';

export type SolidVersion = 1 | 2;

export type SolidRendererId = 'solid' | 'solid-next';

async function resolveInstalledSolidJsVersion(
    packageManager: JsPackageManager
): Promise<string | undefined> {
    const fromInstaller = await packageManager.getInstalledVersion('solid-js');

    if (fromInstaller) {
        return fromInstaller;
    }

    return (await packageManager.getModulePackageJSON('solid-js'))?.version;
}

/** Resolves the Solid major version from the project's installed `solid-js`. */
export async function resolveSolidVersion(configDir: string): Promise<SolidVersion> {
    const packageManager = JsPackageManagerFactory.getPackageManager({ configDir });
    const version = await resolveInstalledSolidJsVersion(packageManager);

    if (!version) {
        throw new Error('Could not detect Solid version: `solid-js` is not installed.');
    }

    const solidMajor = major(version);

    if (solidMajor !== 1 && solidMajor !== 2) {
        throw new Error(`Unsupported Solid version: ${version}`);
    }

    return solidMajor as SolidVersion;
}

export function resolveSolidRendererEntry(solidVersion: SolidVersion): string {
    return solidVersion === 2
        ? 'storybook-solidjs-vite/renderer/solid-next'
        : 'storybook-solidjs-vite/renderer/solid-legacy';
}

/** Stable import id for the default (Solid 2) renderer. */
export const SOLID_DEFAULT_RENDERER_IMPORT = 'storybook-solidjs-vite/renderer/solid-next';

/** Stable import id for `definePreview`; preset aliases this to the active renderer. */
export const SOLID_PREVIEW_ADDON_IMPORT = 'storybook-solidjs-vite/renderer/preview-addon';

/** Stable import id for the Solid 1 renderer. */
export const SOLID_LEGACY_RENDERER_IMPORT = 'storybook-solidjs-vite/renderer/solid-legacy';
