import { describe, expect, it } from 'vitest';

import { createDefaultRender } from '../../renderer/shared/default-render';

describe('createDefaultRender', () => {
    it('throws when the story is missing a component annotation', () => {
        const render = createDefaultRender(() => null);

        expect(() => render(null as any, { id: 'button--primary' } as any)).toThrow(
            'Unable to render story button--primary as the component annotation is missing from the default export'
        );
    });

    it('passes component and args to the runtime createComponent helper', () => {
        const component = Symbol('component');
        const args = { label: 'Save' };
        const render = createDefaultRender((passedComponent, passedArgs) => ({
            component: passedComponent,
            args: passedArgs,
        }));

        expect(render(null as any, { component, args } as any)).toEqual({
            component,
            args,
        });
    });
});
