import { describe, expect, it, vi } from 'vitest';

import { features } from '../../framework/preset';

describe('features preset', () => {
    it('keeps experimentalDocgenServer on by default', async() => {
        const presets = {
            apply: vi.fn().mockResolvedValue('storybook-solidjs-vite'),
        };

        const result = await (features as Function)({}, { presets });

        expect(result.experimentalDocgenServer).toBe(true);
        expect(presets.apply).toHaveBeenCalledWith('framework');
    });

    it('turns experimentalDocgenServer off when framework.options.docgen is false', async() => {
        const presets = {
            apply: vi.fn().mockResolvedValue({
                name: 'storybook-solidjs-vite',
                options: { docgen: false },
            }),
        };

        const result = await (features as Function)(
            { experimentalDocgenServer: true },
            { presets }
        );

        expect(result.experimentalDocgenServer).toBe(false);
    });
});
