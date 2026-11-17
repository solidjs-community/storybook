import { describe, expect, it, vi } from 'vitest';

import { features, isDocgenProviderEnabled } from '../../framework/preset';

describe('features preset', () => {
    it('keeps docgenServer on by default', async() => {
        const presets = {
            apply: vi.fn().mockResolvedValue('storybook-solidjs-vite'),
        };

        const result = await (features as Function)({}, { presets });

        expect(result.docgenServer).toBe(true);
        expect(result.experimentalDocgenServer).toBeUndefined();
        expect(presets.apply).toHaveBeenCalledWith('framework');
    });

    it('turns docgenServer off when framework.options.docgen is false', async() => {
        const presets = {
            apply: vi.fn().mockResolvedValue({
                name: 'storybook-solidjs-vite',
                options: { docgen: false },
            }),
        };

        const result = await (features as Function)(
            { docgenServer: true },
            { presets }
        );

        expect(result.docgenServer).toBe(false);
    });
});

describe('isDocgenProviderEnabled', () => {
    it('is on unless this preset was configured with docgen: false', () => {
        expect(isDocgenProviderEnabled(false, {})).toBe(true);
        expect(isDocgenProviderEnabled(false, { docgen: false })).toBe(false);
    });
});
