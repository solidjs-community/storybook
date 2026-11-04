import { afterEach, describe, expect, it, vi } from 'vitest';

import { decorators as solid1Decorators } from '../../renderer/solid1';
import { decorators as solid2Decorators } from '../../renderer/solid2';
import { testSyntaxGuard } from '../../renderer/shared/test-syntax-guard';

// Only the decorator lists are read. `solid-js-legacy/web` imports a bare `solid-js`,
// which resolves to Solid 2 in this repo.
vi.mock('solid-js-legacy/web', () => ({ render: () => () => {} }));
vi.mock('@solidjs/web', () => ({ render: () => () => {} }));

const ERROR = 'To use the experimental test function, you must enable the experimentalTestSyntax feature flag. See https://storybook.js.org/docs/api/main-config/main-config-features#experimentaltestsyntax';

function runGuard(tags: string[]) {
    return testSyntaxGuard((() => 'story') as any, { tags } as any);
}

describe('testSyntaxGuard', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('throws React\'s error for a test-fn story when experimentalTestSyntax is off', () => {
        vi.stubGlobal('FEATURES', { experimentalTestSyntax: false });

        expect(() => runGuard(['test-fn'])).toThrowError(ERROR);
    });

    it('throws when FEATURES is not defined', () => {
        vi.stubGlobal('FEATURES', undefined);

        expect(() => runGuard(['test-fn'])).toThrowError(ERROR);
    });

    it('renders a test-fn story when experimentalTestSyntax is on', () => {
        vi.stubGlobal('FEATURES', { experimentalTestSyntax: true });

        expect(runGuard(['test-fn'])).toBe('story');
    });

    it('renders stories without the test-fn tag when experimentalTestSyntax is off', () => {
        vi.stubGlobal('FEATURES', {});

        expect(runGuard(['dev', 'test'])).toBe('story');
    });

    it('is registered by both renderer entries', () => {
        expect(solid2Decorators).toContain(testSyntaxGuard);
        expect(solid1Decorators).toContain(testSyntaxGuard);
    });
});
