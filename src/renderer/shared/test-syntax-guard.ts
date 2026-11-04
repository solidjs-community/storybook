import { global } from '@storybook/global';
import { Tag } from 'storybook/preview-api';

import type { Decorator } from '../../preview/public-api';

/**
 * Throws on `.test()` stories (`test-fn` tag) when `features.experimentalTestSyntax` is off.
 * Same check and message as React's `entry-preview.tsx` decorator.
 */
export const testSyntaxGuard: Decorator = (story, context) => {
    // `experimentalTestSyntax` is a framework-level flag, not part of core's `features` type.
    const features = global.FEATURES as { experimentalTestSyntax?: boolean } | undefined;

    if (context.tags?.includes(Tag.TEST_FN) && !features?.experimentalTestSyntax) {
        throw new Error(
            'To use the experimental test function, you must enable the experimentalTestSyntax feature flag. See https://storybook.js.org/docs/api/main-config/main-config-features#experimentaltestsyntax'
        );
    }

    return story();
};

/** Renderer-level decorators shared by the Solid 1 and Solid 2 entries. */
export const decorators: Decorator[] = [testSyntaxGuard];
