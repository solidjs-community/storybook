import { createMemo, createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { mount } from '../../renderer/solid2';

// Skip a real DOM render. The assertion only reads the reactive args.
vi.mock('@solidjs/web', () => ({
    render: () => () => {},
}));

describe('Solid 2 mount', () => {
    it('shows story args and globals to a reactive reader on first render', async() => {
        let seen = '';
        const context = {
            id: 'repro-args--basic',
            args: { user: { name: 'Ada' } },
            globals: { theme: 'dark' },
            forceRemount: false,
            canvas: 'canvas',
            renderToCanvas: async() => {
                createRoot((dispose) => {
                    try {
                        const label = createMemo(() => `${context.args.user.name}/${context.globals.theme}`);

                        seen = label();
                    }
                    finally {
                        dispose();
                    }
                });
            },
        } as any;

        await expect(mount(context)()).resolves.toBe('canvas');
        expect(seen).toBe('Ada/dark');
    });
});
