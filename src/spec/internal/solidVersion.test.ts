import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('storybook/internal/common', { spy: true });

import { JsPackageManagerFactory } from 'storybook/internal/common';

import { resolveSolidVersion } from '../../internal/solidVersion';

describe('resolveSolidVersion', () => {
    beforeEach(() => {
        vi.mocked(JsPackageManagerFactory.getPackageManager).mockReturnValue({
            getInstalledVersion: vi.fn(),
            getModulePackageJSON: vi.fn(),
        } as unknown as ReturnType<typeof JsPackageManagerFactory.getPackageManager>);
    });

    it('reads the installed module version when the package manager has no lockfile entry', async () => {
        const packageManager = JsPackageManagerFactory.getPackageManager({ configDir: '/tmp' });

        vi.mocked(packageManager.getInstalledVersion).mockResolvedValue(null);
        vi.mocked(packageManager.getModulePackageJSON).mockResolvedValue({
            version: '2.0.0-rc.1',
        } as Awaited<ReturnType<typeof packageManager.getModulePackageJSON>>);

        await expect(resolveSolidVersion('/tmp')).resolves.toBe(2);
    });

    it('prefers the package manager installed version when available', async () => {
        const packageManager = JsPackageManagerFactory.getPackageManager({ configDir: '/tmp' });

        vi.mocked(packageManager.getInstalledVersion).mockResolvedValue('1.9.15');
        vi.mocked(packageManager.getModulePackageJSON).mockResolvedValue({
            version: '2.0.0-rc.1',
        } as Awaited<ReturnType<typeof packageManager.getModulePackageJSON>>);

        await expect(resolveSolidVersion('/tmp')).resolves.toBe(1);
    });
});
