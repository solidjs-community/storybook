import { describe, expect, it } from 'vitest';

import { isFrameworkDocgenEnabled } from '../../framework/docgenOption';

describe('isFrameworkDocgenEnabled', () => {
    it('is enabled when framework is a string name', () => {
        expect(isFrameworkDocgenEnabled('storybook-solidjs-vite')).toBe(true);
    });

    it('is enabled when options omit docgen', () => {
        expect(isFrameworkDocgenEnabled({
            name: 'storybook-solidjs-vite',
            options: {},
        })).toBe(true);
    });

    it('is disabled when options.docgen is false', () => {
        expect(isFrameworkDocgenEnabled({
            name: 'storybook-solidjs-vite',
            options: { docgen: false },
        })).toBe(false);
    });
});
