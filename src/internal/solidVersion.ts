import { major } from 'semver';
import { readDependencyManifest } from 'storybook/internal/common';

export type SolidVersion = 1 | 2;

export type SolidRendererId = 'solid1' | 'solid2';

/** Stable import id for the default (Solid 2) renderer. */
export const SOLID_2_RENDERER_IMPORT = 'storybook-solidjs-vite/renderer/solid2';

/** Stable import id for `definePreview`; preset aliases this to the active renderer. */
export const SOLID_PREVIEW_ADDON_IMPORT = 'storybook-solidjs-vite/renderer/preview-addon';

/** Stable import id for the Solid 1 renderer. */
export const SOLID_1_RENDERER_IMPORT = 'storybook-solidjs-vite/renderer/solid1';

/** Resolves the Solid major version from the project's installed `solid-js`. */
export async function resolveSolidVersion(configDir: string): Promise<SolidVersion> {
    const manifest = await readDependencyManifest(configDir, 'solid-js');
    const version = manifest?.version;

    if (!version) {
        throw new Error('Could not detect Solid version: `solid-js` is not installed.');
    }

    const solidMajor = major(version);

    if (solidMajor !== 1 && solidMajor !== 2) {
        throw new Error(`Unsupported Solid version: ${ version }`);
    }

    return solidMajor as SolidVersion;
}

export function resolveSolidRendererEntry(solidVersion: SolidVersion): string {
    return solidVersion === 2
        ? SOLID_2_RENDERER_IMPORT
        : SOLID_1_RENDERER_IMPORT;
}
