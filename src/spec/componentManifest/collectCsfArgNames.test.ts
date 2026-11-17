import { describe, expect, it } from 'vitest';

import { collectCsfArgNamesFromSource } from '../../internal/componentManifest/collectCsfArgNames';

describe('collectCsfArgNames', () => {
    it('records every static arg key, including computed string, template and numeric keys', () => {
        const names = collectCsfArgNamesFromSource(`
            const key = 'dynamic';

            export default { title: 'Example/Button', args: { label: 'Hi', 'aria-label': 'Label' } };

            export const Primary = {
                args: { ['size']: 'lg', [\`tone\`]: 'warm', 1: 'one', [key]: 'skipped' },
            };
        `);

        expect([...names].sort()).toEqual(['1', 'aria-label', 'label', 'size', 'tone']);
    });
});
