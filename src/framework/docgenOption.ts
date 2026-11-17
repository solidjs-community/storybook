import type { FrameworkOptions } from './public-api';

/**
 * Whether Solid component-meta docgen should run (Controls, Docs, manifest / docgen server).
 * `framework.options.docgen: false` opts out.
 */
export function isFrameworkDocgenEnabled(framework: unknown): boolean {
    if (typeof framework !== 'object' || framework == null) {
        return true;
    }

    const options = (framework as { options?: FrameworkOptions }).options;

    return options?.docgen !== false;
}
