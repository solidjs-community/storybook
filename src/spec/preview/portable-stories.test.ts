// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';

import {
    composeStories,
    composeStory,
    INTERNAL_DEFAULT_PROJECT_ANNOTATIONS,
    setProjectAnnotations,
} from '../../index';
import { played } from './fixtures/Button';
import * as csfNextStories from './fixtures/Button.csf-next.stories';
import * as csf3Stories from './fixtures/Button.stories';

afterEach(() => {
    played.length = 0;
    document.body.replaceChildren();
});

describe('portable stories', () => {
    it('uses the Solid renderer annotations by default', () => {
        expect(INTERNAL_DEFAULT_PROJECT_ANNOTATIONS.render).toBeTypeOf('function');
        expect(INTERNAL_DEFAULT_PROJECT_ANNOTATIONS.renderToCanvas).toBeTypeOf('function');
        expect(INTERNAL_DEFAULT_PROJECT_ANNOTATIONS.mount).toBeTypeOf('function');
        expect(INTERNAL_DEFAULT_PROJECT_ANNOTATIONS.parameters?.['renderer']).toBe('solid2');
    });

    it.each([
        ['CSF 3', composeStories(csf3Stories), 'CSF 3 primary'],
        ['CSF Next', composeStories(csfNextStories), 'CSF Next primary'],
    ] as const)('composeStories renders a %s story and runs play', async(_name, stories, label) => {
        const { Primary, Secondary } = stories;
        const canvasElement = document.createElement('div');

        document.body.append(canvasElement);

        expect(Primary.args).toEqual({ label, primary: true });

        await Primary.run({ canvasElement });

        expect(canvasElement.querySelector('button')?.textContent).toBe(label);
        expect(canvasElement.querySelector('button')?.dataset['primary']).toBe('true');
        expect(played).toEqual([label]);

        await Secondary.run({ canvasElement });

        expect(canvasElement.querySelectorAll('button')).toHaveLength(1);
        expect(canvasElement.querySelector('button')?.textContent).toBe('From meta');
    });

    it('composeStory composes one CSF 3 story with its meta', async() => {
        const Primary = composeStory(csf3Stories.Primary, csf3Stories.default);

        await Primary.run();

        expect(document.body.querySelector('button')?.textContent).toBe('CSF 3 primary');
        expect(played).toEqual(['CSF 3 primary']);
    });

    it('setProjectAnnotations layers project annotations over the Solid defaults', async() => {
        try {
            setProjectAnnotations([{ parameters: { fromProject: true } }]);

            const Primary = composeStory(csf3Stories.Primary, csf3Stories.default);

            expect(Primary.parameters).toMatchObject({ renderer: 'solid2', fromProject: true });

            await Primary.run();

            expect(document.body.querySelector('button')?.textContent).toBe('CSF 3 primary');
        }
        finally {
            Reflect.deleteProperty(globalThis, 'globalProjectAnnotations');
            Reflect.deleteProperty(globalThis, 'defaultProjectAnnotations');
            Reflect.deleteProperty(globalThis, '__STORYBOOK_SET_PROJECT_ANNOTATIONS_CALLED__');
        }
    });
});
