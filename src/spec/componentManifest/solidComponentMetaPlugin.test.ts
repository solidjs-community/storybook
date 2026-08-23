import { describe, expect, it } from 'vitest';

import { solidComponentMetaPlugin } from '../../internal/componentManifest/solidComponentMetaPlugin';

describe('solidComponentMetaPlugin transform filter', () => {
    it('is a Vite object hook that excludes query-string ids', () => {
        const plugin = solidComponentMetaPlugin({ enabled: true });
        const transform = plugin.transform as {
            filter: { id: { include: RegExp; exclude: RegExp } };
            handler: (code: string, id: string) => Promise<unknown>;
        };

        expect(transform).toEqual(expect.objectContaining({
            filter: expect.objectContaining({
                id: expect.objectContaining({
                    include: expect.any(RegExp),
                    exclude: expect.any(RegExp),
                }),
            }),
            handler: expect.any(Function),
        }));

        expect(transform.filter.id.exclude.test('Button.tsx?raw')).toBe(true);
        expect(transform.filter.id.exclude.test('Button.tsx?t=1')).toBe(true);
        expect(transform.filter.id.exclude.test('Button.tsx')).toBe(false);
        expect(transform.filter.id.include.test('Button.tsx')).toBe(true);
        expect(transform.filter.id.include.test('Button.stories.tsx')).toBe(true);
        expect(transform.filter.id.exclude.test('Button.stories.tsx')).toBe(true);
    });

    it('returns null for ids that carry a query string', async() => {
        const plugin = solidComponentMetaPlugin({ enabled: true });
        const transform = plugin.transform as {
            handler: (code: string, id: string) => Promise<unknown>;
        };

        await expect(transform.handler('export const Button = () => null;', 'Button.tsx?raw')).resolves.toBeNull();
        await expect(transform.handler('export const Button = () => null;', 'Button.tsx?t=1')).resolves.toBeNull();
    });
});
